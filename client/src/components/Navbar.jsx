import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="navbar">
      <Link to={user ? '/notes' : '/login'} className="brand">Take-Note</Link>
      <nav className="nav-links">
        {user ? (
          <>
            <span className="nav-user">Hi, {user.name}</span>
            <button type="button" className="link-button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Sign Up</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
