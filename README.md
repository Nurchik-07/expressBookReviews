# Book Review API

Final project for IBM's Developing Back-End Apps with Node.js and Express.
Based on the IBM Skills Network `expressBookReviews` starter repository.

## Run

Requires Node.js 20 or later. In `final_project`:

```sh
npm ci
npm start
```

The demo listens on `http://127.0.0.1:5000`. Users, sessions and reviews are
stored in memory and reset when the process restarts. Use only demonstration
credentials. This is a local coursework application, with no public deployment.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | List all books |
| GET | `/isbn/:isbn` | Find a book by ISBN |
| GET | `/author/:author` | Find books by author, ignoring case |
| GET | `/title/:title` | Find books by title, ignoring case |
| GET | `/review/:isbn` | Read reviews |
| POST | `/register` | Register a demonstration user |
| POST | `/customer/login` | Log in and create a session |
| PUT | `/customer/auth/review/:isbn` | Add or modify the logged-in user's review |
| DELETE | `/customer/auth/review/:isbn` | Delete only the logged-in user's review |

Registration and login accept JSON `username` and `password`. Review creation
accepts JSON `review` or the assignment's `review` query parameter. Preserve the
session cookie between login and authenticated requests.

`final_project/router/general.js` exports four Axios retrieval methods:
`getAllBooks` (async/await with an optional error-first callback), `getBookByISBN`
(Promise), `getBooksByAuthor` (async/await), and `getBooksByTitle` (Promise).

## Validation

```sh
cd final_project
npm test
```

The integration test makes real HTTP requests and checks 28 assertions, including
search, registration, login, authorization, review ownership, invalid input,
20 concurrent clients, and all four Axios methods.

Passwords use salted scrypt hashes. JWTs are verified server-side, authenticated
identity comes from the session rather than request fields, and session cookies
are HTTP-only. For a production deployment, add durable storage, HTTPS, rate
limiting, a production session store, and explicit persistent secrets.
