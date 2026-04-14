import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('stuff-happens.sqlite');
db.pragma('journal_mode = WAL');

const CARD_DATA = [
  ['Your laptop crashes right before assignment submission', 'https://picsum.photos/seed/card1/300/200', 4.0],
  ['You forget your student ID on exam day', 'https://picsum.photos/seed/card2/300/200', 6.0],
  ['Coffee spills on your lecture notes', 'https://picsum.photos/seed/card3/300/200', 8.0],
  ['You miss the bus to campus by 10 seconds', 'https://picsum.photos/seed/card4/300/200', 10.0],
  ['Fire alarm interrupts your 8 AM class', 'https://picsum.photos/seed/card5/300/200', 12.0],
  ['Your group chat mutes your important question', 'https://picsum.photos/seed/card6/300/200', 14.0],
  ['You wear mismatched shoes to presentation day', 'https://picsum.photos/seed/card7/300/200', 16.0],
  ['Printer runs out of ink five minutes before deadline', 'https://picsum.photos/seed/card8/300/200', 18.0],
  ['You sit in the wrong classroom for 30 minutes', 'https://picsum.photos/seed/card9/300/200', 20.0],
  ['Your umbrella breaks in a storm crossing campus', 'https://picsum.photos/seed/card10/300/200', 22.0],
  ['You forget a mandatory lab coat', 'https://picsum.photos/seed/card11/300/200', 24.0],
  ['Your project file gets corrupted', 'https://picsum.photos/seed/card12/300/200', 26.0],
  ['You accidentally submit the draft version', 'https://picsum.photos/seed/card13/300/200', 28.0],
  ['Your alarm never rings before finals', 'https://picsum.photos/seed/card14/300/200', 30.0],
  ['Your bike gets a flat tire before class', 'https://picsum.photos/seed/card15/300/200', 32.0],
  ['You lose your calculator during exam week', 'https://picsum.photos/seed/card16/300/200', 34.0],
  ['Campus Wi-Fi crashes during online quiz', 'https://picsum.photos/seed/card17/300/200', 36.0],
  ['Your roommate hosts a loud party before your test', 'https://picsum.photos/seed/card18/300/200', 38.0],
  ['You break your glasses before reading-heavy exam', 'https://picsum.photos/seed/card19/300/200', 40.0],
  ['Lab experiment fails due to one small mistake', 'https://picsum.photos/seed/card20/300/200', 42.0],
  ['You miss a compulsory attendance check', 'https://picsum.photos/seed/card21/300/200', 44.0],
  ['Your internship interview overlaps an exam', 'https://picsum.photos/seed/card22/300/200', 46.0],
  ['You forget to save your coding exam answers', 'https://picsum.photos/seed/card23/300/200', 48.0],
  ['Your hard drive dies with thesis notes', 'https://picsum.photos/seed/card24/300/200', 50.0],
  ['You miss registration for a required course', 'https://picsum.photos/seed/card25/300/200', 52.0],
  ['Professor changes exam format unexpectedly', 'https://picsum.photos/seed/card26/300/200', 54.0],
  ['You fail prerequisite and delay graduation', 'https://picsum.photos/seed/card27/300/200', 56.0],
  ['You get food poisoning before oral exam', 'https://picsum.photos/seed/card28/300/200', 58.0],
  ['Your scholarship renewal paperwork is rejected', 'https://picsum.photos/seed/card29/300/200', 60.0],
  ['You are locked out of your email for 3 days', 'https://picsum.photos/seed/card30/300/200', 62.0],
  ['Exam paper has printing errors on key questions', 'https://picsum.photos/seed/card31/300/200', 64.0],
  ['You lose your wallet on a field trip', 'https://picsum.photos/seed/card32/300/200', 66.0],
  ['Your final presentation file will not open', 'https://picsum.photos/seed/card33/300/200', 68.0],
  ['A semester-long project teammate disappears', 'https://picsum.photos/seed/card34/300/200', 70.0],
  ['You get the flu during finals week', 'https://picsum.photos/seed/card35/300/200', 72.0],
  ['Your dorm heating fails in winter exams', 'https://picsum.photos/seed/card36/300/200', 74.0],
  ['You are accused of plagiarism by mistake', 'https://picsum.photos/seed/card37/300/200', 76.0],
  ['You fail an exam by one point', 'https://picsum.photos/seed/card38/300/200', 78.0],
  ['Your visa paperwork is delayed before exchange', 'https://picsum.photos/seed/card39/300/200', 80.0],
  ['You are assigned back-to-back exams with no break', 'https://picsum.photos/seed/card40/300/200', 82.0],
  ['Tuition payment fails and enrollment is blocked', 'https://picsum.photos/seed/card41/300/200', 84.0],
  ['Your thesis advisor leaves the university', 'https://picsum.photos/seed/card42/300/200', 86.0],
  ['Laptop is stolen from the library', 'https://picsum.photos/seed/card43/300/200', 88.0],
  ['You miss graduation application deadline', 'https://picsum.photos/seed/card44/300/200', 90.0],
  ['Your exam answers are uploaded under wrong student ID', 'https://picsum.photos/seed/card45/300/200', 92.0],
  ['A lab accident ruins your final experiment data', 'https://picsum.photos/seed/card46/300/200', 94.0],
  ['You lose housing one week before finals', 'https://picsum.photos/seed/card47/300/200', 96.0],
  ['Server crash deletes your capstone repository', 'https://picsum.photos/seed/card48/300/200', 97.0],
  ['Academic probation notice sent due to clerical error', 'https://picsum.photos/seed/card49/300/200', 98.0],
  ['Your degree audit says you are missing one hidden requirement', 'https://picsum.photos/seed/card50/300/200', 99.0]
];

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      bad_luck_index REAL NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      outcome TEXT,
      misses INTEGER NOT NULL DEFAULT 0,
      round_number INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS game_cards (
      id INTEGER PRIMARY KEY,
      game_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      round_number INTEGER,
      won INTEGER NOT NULL,
      initial_card INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(game_id) REFERENCES games(id),
      FOREIGN KEY(card_id) REFERENCES cards(id)
    );
  `);

  const usersCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (usersCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (username, name, password) VALUES (?, ?, ?)');
    insertUser.run('alice', 'Alice Student', bcrypt.hashSync('password', 10));
    insertUser.run('bob', 'Bob Example', bcrypt.hashSync('password', 10));
  }

  const cardsCount = db.prepare('SELECT COUNT(*) AS count FROM cards').get().count;
  if (cardsCount === 0) {
    const insertCard = db.prepare('INSERT INTO cards (title, image_url, bad_luck_index) VALUES (?, ?, ?)');
    for (const [title, image, index] of CARD_DATA) {
      insertCard.run(title, image, index);
    }
  }

  seedHistoryIfMissing();
}

function seedHistoryIfMissing() {
  const historyCount = db.prepare('SELECT COUNT(*) AS count FROM games').get().count;
  if (historyCount > 0) return;

  const alice = db.prepare('SELECT id FROM users WHERE username = ?').get('alice');
  if (!alice) return;

  const gameStmt = db.prepare(`
    INSERT INTO games (user_id, status, outcome, misses, round_number, created_at, completed_at)
    VALUES (?, 'completed', ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);
  const insertGameCard = db.prepare('INSERT INTO game_cards (game_id, card_id, round_number, won, initial_card) VALUES (?, ?, ?, ?, ?)');

  const cards = db.prepare('SELECT id FROM cards ORDER BY bad_luck_index LIMIT 8').all();
  const game1 = gameStmt.run(alice.id, 'win', 1, 4, '-6 day', '-6 day').lastInsertRowid;
  cards.slice(0, 3).forEach((c) => insertGameCard.run(game1, c.id, null, 1, 1));
  insertGameCard.run(game1, cards[3].id, 1, 1, 0);
  insertGameCard.run(game1, cards[4].id, 2, 0, 0);
  insertGameCard.run(game1, cards[5].id, 3, 1, 0);
  insertGameCard.run(game1, cards[6].id, 4, 1, 0);

  const game2 = gameStmt.run(alice.id, 'win', 2, 5, '-2 day', '-2 day').lastInsertRowid;
  cards.slice(1, 4).forEach((c) => insertGameCard.run(game2, c.id, null, 1, 1));
  insertGameCard.run(game2, cards[4].id, 1, 0, 0);
  insertGameCard.run(game2, cards[5].id, 2, 1, 0);
  insertGameCard.run(game2, cards[6].id, 3, 1, 0);
  insertGameCard.run(game2, cards[7].id, 4, 1, 0);
}

export default db;
