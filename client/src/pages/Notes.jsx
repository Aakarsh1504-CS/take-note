import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import NoteCard from '../components/NoteCard.jsx';
import NoteEditor from '../components/NoteEditor.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/notes');
        if (alive) setNotes(data.notes);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function handleCreate({ title, content }) {
    const { data } = await api.post('/notes', { title, content });
    setNotes((prev) => [data.note, ...prev]);
  }

  async function handleDelete(id) {
    const prev = notes;
    setNotes((cur) => cur.filter((n) => n._id !== id));
    try {
      await api.delete(`/notes/${id}`);
    } catch (err) {
      setNotes(prev);
      setError(err.message);
    }
  }

  return (
    <section className="page notes-page">
      <header className="page-head">
        <h1>Welcome, {user?.name}</h1>
        <p className="muted">Your private notes, only visible to you.</p>
      </header>

      <section className="card">
        <h2 className="card-title">Create a new note</h2>
        <NoteEditor submitLabel="Create" onSubmit={handleCreate} resetOnSuccess />
      </section>

      {loading ? (
        <Spinner label="Loading notes…" />
      ) : (
        <>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notes.length === 0 ? (
            <p className="empty">No notes yet — write your first one above.</p>
          ) : (
            <div className="notes-grid">
              {notes.map((n) => (
                <NoteCard key={n._id} note={n} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
