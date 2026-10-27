const express = require('express');
const axios = require('axios');
const books = require('./booksdb');
const { createUser } = require('./auth_users');
const public_users = express.Router();
public_users.post('/register', async (req, res, next) => {
  try {
    const result = await createUser(req.body.username, req.body.password);
    res.status(result.status).json({ message: result.message });
  } catch (error) { next(error); }
});
public_users.get('/', (req, res) => res.json(books));
const findBook = isbn => Object.hasOwn(books, isbn) ? books[isbn] : undefined;
public_users.get('/isbn/:isbn', (req, res) => {
  const book = findBook(req.params.isbn);
  return book ? res.json(book) : res.status(404).json({ message: 'Book not found' });
});
function matches(field, value) {
  return Object.fromEntries(Object.entries(books).filter(([, book]) =>
    book[field].toLowerCase() === value.toLowerCase()));
}
public_users.get('/author/:author', (req, res) => res.json(matches('author', req.params.author)));
public_users.get('/title/:title', (req, res) => res.json(matches('title', req.params.title)));
public_users.get('/review/:isbn', (req, res) => {
  const book = findBook(req.params.isbn);
  return book ? res.json(book.reviews) : res.status(404).json({ message: 'Book not found' });
});
// Task 10: four non-blocking Axios methods; error-first callback and Promise APIs.
const client = axios.create({ baseURL: process.env.BOOKSHOP_URL || 'http://127.0.0.1:5000', timeout: 5000 });
async function getAllBooks(callback) {
  try {
    const { data } = await client.get('/');
    if (callback) callback(null, data);
    return data;
  } catch (error) {
    if (callback) callback(error);
    throw error;
  }
}
function getBookByISBN(isbn) {
  return client.get('/isbn/' + encodeURIComponent(isbn)).then(response => response.data);
}
async function getBooksByAuthor(author) {
  const { data } = await client.get('/author/' + encodeURIComponent(author));
  return data;
}
function getBooksByTitle(title) {
  return client.get('/title/' + encodeURIComponent(title)).then(response => response.data);
}
module.exports = { general: public_users, getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle };

