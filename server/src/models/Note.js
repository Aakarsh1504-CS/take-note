const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    content: { type: String, default: '', maxlength: 10_000 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index that backs the list query (owner + sort by updatedAt desc).
noteSchema.index({ owner: 1, updatedAt: -1 });

noteSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Note', noteSchema);
