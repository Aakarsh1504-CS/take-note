import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page" style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>404</h1>
      <p className="muted">That page doesn’t exist.</p>
      <Link to="/notes" className="btn btn-primary" style={{ marginTop: 16 }}>Go home</Link>
    </section>
  );
}
