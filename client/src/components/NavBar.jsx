import { Link } from 'react-router-dom';

export default function NavBar({ user, onLogout }) {
  return (
    <header className="navbar">
      <h2>Stuff Happens - University Life Edition</h2>
      <nav>
        <Link to="/">Instructions</Link>
        {user ? (
          <>
            <Link to="/game">Game</Link>
            <Link to="/profile">Profile</Link>
            <button onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/demo">Demo</Link>
            <Link to="/login">Login</Link>
          </>
        )}
      </nav>
    </header>
  );
}
