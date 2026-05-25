const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE_NAME = 'token';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearAuthCookie(res) {
  // Same attributes as set, otherwise some browsers refuse to clear it.
  const { maxAge: _ignored, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
}

exports.register = asyncHandler(async (req, res) => {
  const { email, name, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) throw ApiError.conflict('Email already registered', 'E_EMAIL_TAKEN');

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email, name, passwordHash });

  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw ApiError.unauthorized('Invalid credentials', 'E_CREDENTIALS');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials', 'E_CREDENTIALS');

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user });
});

exports.logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
};

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.unauthorized('User no longer exists', 'E_USER_GONE');
  res.json({ user });
});
