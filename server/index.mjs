import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import db, { initDb } from './db.mjs';

initDb();

const app = express();
const PORT = 3001;
const CLIENT_ORIGIN = 'http://localhost:5173';

app.use(morgan('dev'));
app.use(express.json());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(session({ secret: 'stuff-happens-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy((username, password, done) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return done(null, false, { message: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'Invalid credentials' });
  return done(null, { id: user.id, username: user.username, name: user.name });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(id);
  done(null, user || false);
});

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
};

const getWonCards = (gameId) => db.prepare(`
  SELECT c.id, c.title, c.image_url AS imageUrl, c.bad_luck_index AS badLuckIndex
  FROM game_cards gc JOIN cards c ON c.id = gc.card_id
  WHERE gc.game_id = ? AND gc.won = 1
  ORDER BY c.bad_luck_index
`).all(gameId);

const getUsedCardIds = (gameId) => db.prepare('SELECT card_id FROM game_cards WHERE game_id = ?').all(gameId).map((r) => r.card_id);

function createOffer(gameId, roundNumber) {
  const used = getUsedCardIds(gameId);
  const placeholders = used.map(() => '?').join(',');
  const query = used.length
    ? `SELECT id, title, image_url AS imageUrl, bad_luck_index AS badLuckIndex FROM cards WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
    : 'SELECT id, title, image_url AS imageUrl, bad_luck_index AS badLuckIndex FROM cards ORDER BY RANDOM() LIMIT 1';
  const card = db.prepare(query).get(...used);
  if (!card) return null;
  return { ...card, roundNumber, offeredAt: dayjs().toISOString() };
}

function evaluateGuess(cards, offeredCard, position) {
  const lower = position === 0 ? -Infinity : cards[position - 1].badLuckIndex;
  const upper = position === cards.length ? Infinity : cards[position].badLuckIndex;
  return offeredCard.badLuckIndex > lower && offeredCard.badLuckIndex < upper;
}

app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json(info);
    return req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json(user);
    });
  })(req, res, next);
});

app.get('/api/sessions/current', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'No session' });
  return res.json(req.user);
});

app.delete('/api/sessions/current', (req, res) => req.logout(() => res.status(204).end()));

app.post('/api/game/start', isLoggedIn, (req, res) => {
  const existing = db.prepare("SELECT id FROM games WHERE user_id = ? AND status = 'ongoing'").get(req.user.id);
  if (existing) {
    req.session.currentGameId = existing.id;
    return res.json(buildGameState(existing.id, req));
  }

  const gameId = db.prepare(`
    INSERT INTO games (user_id, status, misses, round_number, created_at)
    VALUES (?, 'ongoing', 0, 1, datetime('now'))
  `).run(req.user.id).lastInsertRowid;

  const initialCards = db.prepare('SELECT id FROM cards ORDER BY RANDOM() LIMIT 3').all();
  const insert = db.prepare('INSERT INTO game_cards (game_id, card_id, round_number, won, initial_card) VALUES (?, ?, null, 1, 1)');
  initialCards.forEach((c) => insert.run(gameId, c.id));

  req.session.currentGameId = gameId;
  const offer = createOffer(gameId, 1);
  req.session.currentOffer = offer;
  return res.json(buildGameState(gameId, req));
});

app.get('/api/game/current', isLoggedIn, (req, res) => {
  const gameId = req.session.currentGameId;
  if (!gameId) return res.status(404).json({ error: 'No ongoing game' });
  return res.json(buildGameState(gameId, req));
});

app.post('/api/game/guess', isLoggedIn, (req, res) => {
  const gameId = req.session.currentGameId;
  const offer = req.session.currentOffer;
  if (!gameId || !offer) return res.status(400).json({ error: 'Round not active' });

  const { position, timeout = false } = req.body;
  const cards = getWonCards(gameId);
  const elapsedSeconds = dayjs().diff(dayjs(offer.offeredAt), 'second');
  const timedOut = timeout || elapsedSeconds > 30;

  let won = false;
  if (!timedOut && Number.isInteger(position) && position >= 0 && position <= cards.length) {
    won = evaluateGuess(cards, offer, position);
  }

  db.prepare('INSERT INTO game_cards (game_id, card_id, round_number, won, initial_card) VALUES (?, ?, ?, ?, 0)')
    .run(gameId, offer.id, offer.roundNumber, won ? 1 : 0);

  if (!won) {
    db.prepare('UPDATE games SET misses = misses + 1 WHERE id = ?').run(gameId);
  }

  const wonCardsCount = db.prepare('SELECT COUNT(*) AS count FROM game_cards WHERE game_id = ? AND won = 1').get(gameId).count;
  const game = db.prepare('SELECT misses FROM games WHERE id = ?').get(gameId);

  let status = 'ongoing';
  let outcome = null;
  if (wonCardsCount >= 6) {
    status = 'completed';
    outcome = 'win';
  } else if (game.misses >= 3) {
    status = 'completed';
    outcome = 'loss';
  }

  if (status === 'completed') {
    db.prepare("UPDATE games SET status = 'completed', outcome = ?, completed_at = datetime('now') WHERE id = ?").run(outcome, gameId);
    req.session.currentOffer = null;
    req.session.currentGameId = null;
  } else {
    req.session.currentOffer = null;
  }

  return res.json({
    won,
    timedOut,
    status,
    outcome,
    offeredCard: won ? offer : null,
    message: won ? 'Correct! Card added.' : 'Wrong position or timeout. Card discarded.'
  });
});

app.post('/api/game/next', isLoggedIn, (req, res) => {
  const gameId = req.session.currentGameId;
  if (!gameId) return res.status(400).json({ error: 'No ongoing game' });
  const game = db.prepare("SELECT round_number, status FROM games WHERE id = ?").get(gameId);
  if (!game || game.status !== 'ongoing') return res.status(400).json({ error: 'Game is not active' });

  const nextRound = game.round_number + 1;
  db.prepare('UPDATE games SET round_number = ? WHERE id = ?').run(nextRound, gameId);
  const offer = createOffer(gameId, nextRound);
  req.session.currentOffer = offer;
  return res.json(buildGameState(gameId, req));
});

app.get('/api/games/history', isLoggedIn, (req, res) => {
  const games = db.prepare(`
    SELECT id, outcome, created_at AS createdAt, completed_at AS completedAt
    FROM games
    WHERE user_id = ? AND status = 'completed'
    ORDER BY datetime(completed_at) DESC
  `).all(req.user.id);

  const cardsStmt = db.prepare(`
    SELECT c.title, gc.round_number AS roundNumber, gc.won, gc.initial_card AS initialCard
    FROM game_cards gc JOIN cards c ON c.id = gc.card_id
    WHERE gc.game_id = ?
    ORDER BY COALESCE(gc.round_number, -1), c.bad_luck_index
  `);

  const payload = games.map((g) => {
    const cards = cardsStmt.all(g.id);
    const collected = cards.filter((c) => c.won === 1).length;
    return { ...g, cards, collected };
  });

  res.json(payload);
});

app.post('/api/demo/start', (req, res) => {
  const initialCards = db.prepare('SELECT id, title, image_url AS imageUrl, bad_luck_index AS badLuckIndex FROM cards ORDER BY RANDOM() LIMIT 3').all()
    .sort((a, b) => a.badLuckIndex - b.badLuckIndex);
  const ids = initialCards.map((c) => c.id);
  const placeholders = ids.map(() => '?').join(',');
  const offer = db.prepare(`SELECT id, title, image_url AS imageUrl, bad_luck_index AS badLuckIndex FROM cards WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`).get(...ids);

  req.session.demo = { initialCards, offer, offeredAt: dayjs().toISOString(), played: false };
  res.json({ cards: initialCards, offer: { id: offer.id, title: offer.title, imageUrl: offer.imageUrl } });
});

app.post('/api/demo/guess', (req, res) => {
  const demo = req.session.demo;
  if (!demo || demo.played) return res.status(400).json({ error: 'Demo round not active' });
  const { position, timeout = false } = req.body;
  const elapsedSeconds = dayjs().diff(dayjs(demo.offeredAt), 'second');
  const timedOut = timeout || elapsedSeconds > 30;
  const won = !timedOut && Number.isInteger(position) && evaluateGuess(demo.initialCards, demo.offer, position);
  demo.played = true;

  res.json({
    won,
    timedOut,
    offeredCard: won ? demo.offer : null,
    message: won ? 'You won the demo round!' : 'Demo round lost.'
  });
});

function buildGameState(gameId, req) {
  const game = db.prepare('SELECT id, misses, round_number AS roundNumber, status, outcome FROM games WHERE id = ?').get(gameId);
  const cards = getWonCards(gameId);
  const offer = req.session.currentOffer
    ? {
      id: req.session.currentOffer.id,
      title: req.session.currentOffer.title,
      imageUrl: req.session.currentOffer.imageUrl,
      roundNumber: req.session.currentOffer.roundNumber
    }
    : null;
  return { game, cards, offer };
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
