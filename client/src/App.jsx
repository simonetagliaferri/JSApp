import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './api';
import NavBar from './components/NavBar';
import CardList from './components/CardList';

function Instructions() {
  return (
    <section>
      <h3>How to play</h3>
      <ul>
        <li>Get 3 initial cards with known bad luck indexes.</li>
        <li>Each round you receive a hidden-index card and choose its position among your cards.</li>
        <li>You have 30 seconds to answer.</li>
        <li>Reach 6 collected cards to win. Miss 3 rounds and you lose.</li>
        <li>Anonymous users can only play one-round demo mode.</li>
      </ul>
    </section>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await onLogin({ username, password });
      navigate('/game');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h3>Login</h3>
      <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" required />
      <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} placeholder="password" required />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}

function PlayArea({ state, onGuess }) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    setSecondsLeft(30);
    const timer = setInterval(() => {
      setSecondsLeft((old) => {
        if (old <= 1) {
          clearInterval(timer);
          onGuess({ timeout: true });
          return 0;
        }
        return old - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.offer?.id]);

  const positions = useMemo(() => {
    const options = [];
    for (let i = 0; i <= state.cards.length; i += 1) {
      options.push(i);
    }
    return options;
  }, [state.cards.length]);

  return (
    <>
      <p>Round: {state.game?.roundNumber || state.offer?.roundNumber} | Misses: {state.game?.misses ?? '-'}</p>
      <p className="timer">Time left: {secondsLeft}s</p>
      {state.offer && (
        <article className="card highlight">
          <img src={state.offer.imageUrl} alt={state.offer.title} />
          <h4>{state.offer.title}</h4>
          <p>Where should this card be placed?</p>
        </article>
      )}
      <div className="positions">
        {positions.map((p) => (
          <button key={p} onClick={() => onGuess({ position: p })}>Place at position {p + 1}</button>
        ))}
      </div>
    </>
  );
}

function Game({ user }) {
  const [state, setState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const game = await api.getCurrentGame();
        setState(game);
      } catch {
        const game = await api.startGame();
        setState(game);
      }
    })();
  }, []);

  const onGuess = async (payload) => {
    if (!state?.offer) return;
    try {
      const result = await api.submitGuess(payload);
      setFeedback(result);
      if (result.status === 'ongoing') {
        const latest = await api.getCurrentGame();
        setState(latest);
      } else {
        setState((old) => ({ ...old, game: { ...old.game, status: 'completed', outcome: result.outcome } }));
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const nextRound = async () => {
    const latest = await api.nextRound();
    setState(latest);
    setFeedback(null);
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!state) return <p>Loading game...</p>;

  return (
    <section>
      <h3>Full Game</h3>
      {error && <p className="error">{error}</p>}
      <CardList cards={state.cards} />
      {state.game?.status === 'completed' ? (
        <div className="panel">
          <h4>Game ended: {state.game.outcome}</h4>
          <p>Total cards collected: {state.cards.length}</p>
          <button onClick={async () => setState(await api.startGame())}>Start new game</button>
        </div>
      ) : (
        <>
          {feedback ? (
            <div className="panel">
              <p>{feedback.message}</p>
              {feedback.offeredCard && <p>Won card index: {feedback.offeredCard.badLuckIndex}</p>}
              <button onClick={nextRound}>Start next round</button>
            </div>
          ) : (
            <PlayArea state={state} onGuess={onGuess} />
          )}
        </>
      )}
    </section>
  );
}

function Demo() {
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.startDemo().then(setState);
  }, []);

  const onGuess = async (payload) => {
    const data = await api.submitDemoGuess(payload);
    setResult(data);
  };

  if (!state) return <p>Loading demo...</p>;

  return (
    <section>
      <h3>Demo game (single round)</h3>
      <CardList cards={state.cards} />
      {result ? (
        <div className="panel">
          <p>{result.message}</p>
          <button onClick={async () => { setResult(null); setState(await api.startDemo()); }}>Play another demo</button>
        </div>
      ) : (
        <PlayArea state={{ cards: state.cards, offer: state.offer }} onGuess={onGuess} />
      )}
    </section>
  );
}

function Profile({ user }) {
  const [games, setGames] = useState([]);

  useEffect(() => {
    if (user) api.getHistory().then(setGames);
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <section>
      <h3>{user.name}'s Game History</h3>
      {games.map((game) => (
        <article className="panel" key={game.id}>
          <h4>{new Date(game.completedAt).toLocaleString()} - {game.outcome.toUpperCase()}</h4>
          <p>Collected cards: {game.collected}</p>
          <ul>
            {game.cards.map((card, idx) => (
              <li key={`${game.id}-${idx}`}>
                {card.title} {card.initialCard ? '(initial)' : `(round ${card.roundNumber})`} - {card.won ? 'won' : 'lost'}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const handleLogin = async (credentials) => {
    const u = await api.login(credentials);
    setUser(u);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <>
      <NavBar user={user} onLogout={handleLogout} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Instructions />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/game" element={<Game user={user} />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
