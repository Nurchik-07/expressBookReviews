const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
process.env.BOOKSHOP_URL = 'http://127.0.0.1:5000';
const app = require('./index');
const methods = require('./router/general');

test('book search, authentication, review ownership and concurrent clients', async () => {
  const server = app.listen(5000, '127.0.0.1');
  await once(server, 'listening');
  let checks = 0;
  const eq = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
  async function request(path, options = {}) {
    const response = await fetch('http://127.0.0.1:5000' + path, {
      ...options, headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const body = data => JSON.stringify(data);
  try {
    eq(Object.keys((await request('/')).data).length, 10);
    eq((await request('/isbn/1')).data.title, 'Things Fall Apart');
    eq(Object.keys((await request('/author/Unknown')).data).length, 4);
    eq((await request('/title/Pride%20and%20Prejudice')).data['8'].author, 'Jane Austen');
    eq((await request('/review/1')).data, {});
    eq((await request('/isbn/missing')).status, 404);
    eq((await request('/customer/auth/review/1', { method: 'PUT', body: body({ review: 'Unauthorized' }) })).status, 401);
    for (const username of ['alice', 'bob']) {
      eq((await request('/register', { method: 'POST', body: body({ username, password: 'LocalDemoOnly123!' }) })).status, 201);
    }
    eq((await request('/register', { method: 'POST', body: body({ username: 'alice', password: 'LocalDemoOnly123!' }) })).status, 409);
    eq((await request('/customer/login', { method: 'POST', body: body({ username: 'alice', password: 'wrong' }) })).status, 401);
    const alice = await request('/customer/login', { method: 'POST', body: body({ username: 'alice', password: 'LocalDemoOnly123!' }) });
    const bob = await request('/customer/login', { method: 'POST', body: body({ username: 'bob', password: 'LocalDemoOnly123!' }) });
    eq(alice.status, 200);
    eq(bob.status, 200);
    const aliceHeaders = { Cookie: alice.cookie };
    const bobHeaders = { Cookie: bob.cookie };
    eq((await request('/customer/auth/review/1', { method: 'PUT', headers: aliceHeaders, body: body({ review: 'Alice review' }) })).status, 200);
    eq((await request('/customer/auth/review/1', { method: 'PUT', headers: bobHeaders, body: body({ review: 'Bob review', username: 'alice' }) })).data.reviews,
      { alice: 'Alice review', bob: 'Bob review' });
    eq((await request('/customer/auth/review/1', { method: 'PUT', headers: aliceHeaders, body: body({ review: 'Updated' }) })).data.reviews,
      { alice: 'Updated', bob: 'Bob review' });
    eq((await request('/customer/auth/review/1', { method: 'DELETE', headers: bobHeaders, body: body({ username: 'alice' }) })).data.reviews,
      { alice: 'Updated' });
    eq((await request('/customer/auth/review/1', { method: 'DELETE', headers: bobHeaders })).status, 404);
    eq((await request('/customer/auth/review/1', { method: 'PUT', headers: aliceHeaders, body: body({ review: '' }) })).status, 400);
    eq((await request('/customer/auth/review/1', { method: 'DELETE', headers: aliceHeaders })).data.reviews, {});
    eq((await request('/customer/auth/review/1', { method: 'PUT', headers: { Cookie: 'connect.sid=invalid' }, body: body({ review: 'bad' }) })).status, 401);
    eq((await request('/register', { method: 'POST', body: '{bad json' })).status, 400);
    const results = await Promise.all(Array.from({ length: 20 }, () => request('/isbn/8')));
    eq(results.every(result => result.status === 200), true);
    let callbackCalled = false;
    eq(Object.keys(await methods.getAllBooks((error, data) => { assert.ifError(error); callbackCalled = Object.keys(data).length === 10; })).length, 10);
    eq(callbackCalled, true);
    eq((await methods.getBookByISBN(1)).author, 'Chinua Achebe');
    eq(Object.keys(await methods.getBooksByAuthor('Unknown')).length, 4);
    eq((await methods.getBooksByTitle('Pride and Prejudice'))['8'].author, 'Jane Austen');
    console.log('PASS: ' + checks + ' integration assertions, including all four Axios methods');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
