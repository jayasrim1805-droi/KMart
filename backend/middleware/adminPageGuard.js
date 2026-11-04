const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { COOKIE_NAME, ROLES } = require('../config/constants');

// Stops non-admins from even downloading /admin/*.html pages (nicer UX).
// The real security is still on the API: every admin API route checks the role.
module.exports = (req, res, next) => {
  try {
    const payload = jwt.verify(req.cookies[COOKIE_NAME], config.jwtSecret);
    if (payload.role === ROLES.ADMIN) return next();
  } catch (err) {
    /* fall through to redirect */
  }
  res.redirect('/login.html?admin=1&next=' + encodeURIComponent(req.originalUrl));
};
