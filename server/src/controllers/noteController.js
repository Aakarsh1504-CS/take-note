const mongoose = require('mongoose');
const Note = require('../models/Note');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function assertObjectId(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid note id', 'E_ID');
}

async function loadOwned(id, userId) {
  assertObjectId(id);
  const note = await Note.findById(id);
  if (!note) throw ApiError.notFound('Note not found', 'E_NOTE_MISSING');
  if (note.owner.toString() !== userId) throw ApiError.forbidden();
  return note;
}

exports.list = asyncHandler(async (req, res) => {
  // Pagination: ?limit + ?before=<ISO updatedAt>. Cursor-based on updatedAt
  // (the sort field), which is stable as long as we tiebreak by _id.
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT, 1), MAX_LIMIT);

  const filter = { owner: req.user.id };
  if (req.query.before) {
    const ts = new Date(req.query.before);
    if (!Number.isNaN(ts.getTime())) filter.updatedAt = { $lt: ts };
  }

  // Fetch limit+1 so we can tell whether more pages exist.
  const rows = await Note.find(filter)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const notes = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? notes[notes.length - 1].updatedAt.toISOString() : null;

  res.json({ notes, nextCursor, hasMore });
});

exports.create = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const note = await Note.create({
    title: title.trim(),
    content: (content || '').trim(),
    owner: req.user.id,
  });
  res.status(201).json({ note });
});

exports.getOne = asyncHandler(async (req, res) => {
  const note = await loadOwned(req.params.id, req.user.id);
  res.json({ note });
});

exports.update = asyncHandler(async (req, res) => {
  const note = await loadOwned(req.params.id, req.user.id);

  if (typeof req.body.title === 'string') note.title = req.body.title.trim();
  if (typeof req.body.content === 'string') note.content = req.body.content.trim();
  await note.save();
  res.json({ note });
});

exports.remove = asyncHandler(async (req, res) => {
  const note = await loadOwned(req.params.id, req.user.id);
  await note.deleteOne();
  res.json({ ok: true });
});
