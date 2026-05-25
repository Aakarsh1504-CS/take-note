const crypto = require('crypto');

// Honour an incoming X-Request-Id (so a load balancer or upstream can
// correlate logs) or generate one. Always echo it back on the response.
module.exports = function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  const id = incoming && incoming.length <= 100 ? incoming : crypto.randomUUID();
  req.id = id;
  res.set('X-Request-Id', id);
  next();
};
