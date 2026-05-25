import { useRef } from 'react';
import { Link } from 'react-router-dom';

const MAX_TILT = 8; // degrees

export default function NoteCard({ note, onDelete }) {
  const ref = useRef(null);
  const preview = (note.content || '').slice(0, 140);

  function handleMove(e) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;  // 0..1
    const py = (e.clientY - rect.top) / rect.height;  // 0..1
    const rx = (0.5 - py) * (MAX_TILT * 2);
    const ry = (px - 0.5) * (MAX_TILT * 2);
    el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }

  return (
    <article
      ref={ref}
      className="note-card tilt"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="note-card-glare" aria-hidden="true" />
      <header className="note-card-head">
        <h3 className="note-card-title">{note.title}</h3>
      </header>
      {preview && (
        <p className="note-card-preview">
          {preview}{note.content.length > 140 ? '…' : ''}
        </p>
      )}
      <footer className="note-card-actions">
        <Link className="btn btn-ghost" to={`/notes/${note._id}`}>Open</Link>
        <button type="button" className="btn btn-danger" onClick={() => onDelete(note._id)}>Delete</button>
      </footer>
    </article>
  );
}
