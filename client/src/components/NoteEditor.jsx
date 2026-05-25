import { useRef, useState } from 'react';

export default function NoteEditor({
  initialTitle = '',
  initialContent = '',
  submitLabel = 'Save',
  resetOnSuccess = false,
  onSubmit,
  onCancel,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Hard reentrancy guard — React state updates are async, so a rapid
  // double-click could race past `busy` becoming true.
  const submitting = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), content: content.trim() });
      if (resetOnSuccess) {
        setTitle('');
        setContent('');
      }
    } catch (err) {
      setError(err.message || 'Could not save');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="note-editor" onSubmit={handleSubmit}>
      <input
        type="text"
        className="input"
        placeholder="Title"
        value={title}
        maxLength={80}
        onChange={(e) => setTitle(e.target.value)}
        disabled={busy}
      />
      <textarea
        className="input textarea"
        placeholder="Write your note…"
        value={content}
        maxLength={10_000}
        onChange={(e) => setContent(e.target.value)}
        disabled={busy}
        rows={6}
      />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
