const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const books = require('./booksdb');
const deriveKey = promisify(crypto.scrypt);
const regd_users = express.Router();
const users = [];
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const isValid = username => users.some(user => user.username === username);
async function createUser(username, password) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(username) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return { status: 400, message: 'Use a 1-40 character username and an 8-128 character password' };
  }
  if (isValid(username)) return { status: 409, message: 'Username already exists' };
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await deriveKey(password, salt, 64)).toString('hex');
  if (isValid(username)) return { status: 409, message: 'Username already exists' };
  users.push({ username, salt, hash });
  return { status: 201, message: 'User successfully registered. You may now log in.' };
}
async function authenticatedUser(username, password) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const user = users.find(entry => entry.username === username);
  if (!user) return false;
  const hash = await deriveKey(password, user.salt, 64);
  return crypto.timingSafeEqual(hash, Buffer.from(user.hash, 'hex'));
}
regd_users.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!await authenticatedUser(username, password))
      return res.status(401).json({ message: 'Invalid username or password' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.authorization = {
        token: jwt.sign({ username }, jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })
      };
      res.json({ message: 'Successfully logged in', username });
    });
  } catch (error) { next(error); }
});
function auth(req, res, next) {
  const token = req.session.authorization && req.session.authorization.token;
  if (!token) return res.status(401).json({ message: 'Please log in first' });
  try {
    req.username = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }).username;
    next();
  } catch (error) { return res.status(401).json({ message: 'Invalid or expired session' }); }
}
regd_users.put('/auth/review/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) && books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found' });
  const review = req.body.review || req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 2000)
    return res.status(400).json({ message: 'Provide a nonempty review of up to 2000 characters' });
  Object.defineProperty(book.reviews, req.username, {
    value: review.trim(), writable: true, configurable: true, enumerable: true
  });
  res.json({ message: 'Review added or updated', reviews: book.reviews });
});
regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) && books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found' });
  if (!Object.hasOwn(book.reviews, req.username))
    return res.status(404).json({ message: 'You have no review for this book' });
  delete book.reviews[req.username];
  res.json({ message: 'Your review has been deleted', reviews: book.reviews });
});
module.exports = { authenticated: regd_users, isValid, users, createUser, authenticatedUser, auth };

