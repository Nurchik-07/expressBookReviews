const express = require('express');
const session = require('express-session');
const crypto = require('node:crypto');
const { authenticated, auth } = require('./router/auth_users');
const { general } = require('./router/general');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/customer', session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 1000 }
}));
app.use('/customer/auth', auth);
app.use('/customer', authenticated);
app.use('/', general);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, req, res, next) => {
  res.status(error.type === 'entity.parse.failed' ? 400 : 500)
    .json({ message: error.type === 'entity.parse.failed' ? 'Invalid JSON' : 'Internal server error' });
});
if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, '127.0.0.1', () => console.log('Book review server listening on http://127.0.0.1:' + port));
}
module.exports = app;

