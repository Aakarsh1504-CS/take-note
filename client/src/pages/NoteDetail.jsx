import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import NoteEditor from '../components/NoteEditor.jsx';
import Spinner from '../components/Spinner.jsx';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/notes/${id}`);
        if (alive) setNote(data.note);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function handleSave({ title, content }) {
    const { data } = await api.patch(`/notes/${id}`, { title, content });
    setNote(data.note);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    try {
      await api.delete(`/notes/${id}`);
      navigate('/notes', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Spinner label="Loading note…" />;
  if (error && !note) {
    return (
      <section className="page">
        <p className="form-error">{error}</p>
        <Link to="/notes" className="btn btn-ghost">Back to notes</Link>
      </section>
    );
  }
  if (!note) return null;

  return (
    <section className="page detail-page">
      <div className="detail-toolbar">
        <Link to="/notes" className="btn btn-ghost">← Back</Link>
        {!editing && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </>
        )}
      </div>

      {editing ? (
        <article className="card">
          <h2 className="card-title">Edit note</h2>
          <NoteEditor
            initialTitle={note.title}
            initialContent={note.content}
            submitLabel="Save changes"
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
          />
        </article>
      ) : (
        <article className="card">
          <h1 className="detail-title">{note.title}</h1>
          <hr className="rule" />
          {note.content
            ? <p className="detail-content">{note.content}</p>
            : <p className="muted">(empty)</p>
          }
          <p className="muted small">Last updated {new Date(note.updatedAt).toLocaleString()}</p>
        </article>
      )}
    </section>
  );
}
