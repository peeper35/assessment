# FX Trading API: Node.js Backend Assessment

You've joined the team that builds the backend for our forex (FX) trading app. A colleague started a small service that shows live currency quotes and client accounts, but they never finished it, and QA has reported some bugs.

Your job is to **fix the bugs and finish the trading feature**.

- **Level:** Mid-level
- **Expected time:** 2 to 3 hours
- **Stack:** Node.js (>= 20), Express 4, the built-in `node:test` runner. No database: data lives in memory.

---

## Getting started

```bash
npm install
npm test     # runs the test suite
npm start    # starts the API on http://localhost:3000
```

When you first run `npm test`, **most tests fail. That's expected.** When you're done, they should all pass.

---

## FX primer (read this if you're new to forex)

| Term | Meaning |
|------|---------|
| **Currency pair** | e.g. `EUR/USD`. The first currency is the **base**, the second is the **quote**. A price of `1.0850` means 1 EUR = 1.0850 USD. |
| **Mid** | The market's mid-point price, which comes from our liquidity provider. |
| **Bid / Ask** | We quote clients two prices. The **bid** is what the client gets when they **SELL** the base currency. The **ask** is what the client pays when they **BUY** it. `bid < mid < ask`. |
| **Spread** | `ask - bid`. This is how the business earns money. It's set per pair and measured in pips. |
| **Pip** | The standard smallest price move. It's `0.0001` for most pairs and **`0.01` for JPY pairs** (e.g. `USD/JPY`). |

**Example.** Here's a client who **BUYs 1,000 EUR/USD** when the ask is `1.08506`:
- they receive **1,000.00 EUR** (base)
- they pay **1,000 × 1.08506 = 1,085.06 USD** (quote)

A **SELL** works the other way round: the client gives up base currency and receives `amount × bid` in quote currency.

---

## The current code

```
src/
  server.js                  starts the HTTP server
  app.js                     Express app, routers, error handler
  errors.js                  HttpError(status, message)
  money.js                   toMinor / toMajor helpers
  data/
    db.js                    in-memory store + seed data + simulated DB latency
    accountRepository.js     async account reads and writes (behaves like a DB client)
    orderRepository.js       async order reads and writes
  services/
    rateProvider.js          fake upstream price feed (async, with network latency)
    rateService.js           turns mid prices into client bid/ask quotes
    orderService.js          ← TODO: order execution
  routes/
    rates.js                 GET /rates, GET /rates/:pair
    accounts.js              GET /accounts/:id, GET /accounts/:id/orders
    orders.js                POST /orders
test/
  helpers.js                 boots the app on a random port and resets state before each test
  rates.test.js
  accounts.test.js
  orders.test.js
```

Some important conventions:

- **Money is stored as integer minor units (cents)** in `db.js`. For example, `1_000_000` means `10,000.00`. In this system **every currency, including JPY, has 2 decimal places.** The API accepts and returns money in **major units** (e.g. `1085.06`).
- **Repositories are async and return copies, just like a real DB.** If you change an object you got from `findById`, nothing is saved until you call `updateBalances`.
- **The rate provider is async.** Each call takes 5 to 25 ms.
- Seed accounts:
  - `acc_1` (Alice): 10,000.00 USD
  - `acc_2` (Bob): 500.00 USD and 2,000.00 EUR
- Supported pairs: `EUR/USD`, `GBP/USD`, `USD/JPY`, `EUR/GBP`. Pair input is case- and separator-insensitive (`EURUSD`, `eur-usd` and `EUR/USD` all work).

### Endpoints that already exist

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Liveness check |
| GET | `/rates` | Quotes for every supported pair |
| GET | `/rates/:pair` | One quote: `{ pair, base, quote, bid, ask, timestamp }` |
| GET | `/accounts/:id` | `{ id, owner, balances }`, with balances in major units |
| GET | `/accounts/:id/orders` | Wired up, but the service isn't implemented yet |
| POST | `/orders` | Wired up, but the service isn't implemented yet (returns 501) |

---

## Your tasks

### Task 1: Fix the reported bugs

QA filed these tickets. Find the root cause of each one and fix it.

1. **"USD/JPY quotes show no spread."** On `GET /rates/USDJPY` the bid and ask come back as the same price. Other pairs look fine.
2. **"Requesting an unknown pair hangs."** `GET /rates/XAUBTC` never responds. It should return `404` with an error message.
3. **"Unknown account returns 500."** `GET /accounts/does-not-exist` should return `404`, not `500`.

The tests in `rates.test.js` and `accounts.test.js` cover these bugs.

### Task 2: Implement market orders

Implement `placeMarketOrder` and `listOrders` in `src/services/orderService.js`.

**`POST /orders`**

Request:
```json
{ "accountId": "acc_1", "pair": "EUR/USD", "side": "BUY", "amount": 1000 }
```
`amount` is the **base currency** amount, in major units.

Success response (`201`):
```json
{
  "id": "…",
  "accountId": "acc_1",
  "pair": "EUR/USD",
  "side": "BUY",
  "amount": 1000,
  "rate": 1.08506,
  "quoteAmount": 1085.06,
  "status": "FILLED",
  "createdAt": "2026-01-01T12:00:00.000Z"
}
```

Rules:
- Fetch a **fresh quote** for every order. A BUY fills at the **ask** and a SELL fills at the **bid**.
- Round `quoteAmount` to the **nearest cent**.
- Update both of the account's balances (base and quote) and save the order.
- Do the money arithmetic without floating point drift. Hint: use `src/money.js`.

Errors (always respond with a JSON body `{ "error": "<message>" }`):

| Status | When |
|--------|------|
| `400` | `side` is not `BUY` or `SELL`; `pair` or `accountId` is missing; `amount` is not a positive **number** with at most 2 decimal places |
| `404` | unknown account or unsupported pair |
| `422` | the account doesn't have enough funds in the currency it's paying with. **Balances must not change.** |

**`GET /accounts/:id/orders`** returns that account's orders, **newest first**. It returns `404` if the account doesn't exist.

### Task 3: Make it safe under concurrent load

Clients often send several orders at the same time, for example from an algo or a double-clicked button. The repositories and the rate feed are async, so requests for the same account can overlap.

Your implementation must guarantee two things:
- **No lost updates.** If 10 orders arrive at the same time and the account can afford all of them, all 10 are applied.
- **No overdrafts.** If the account can only afford some of them, the extra orders are rejected with `422` and the balance never goes negative.

You can't change how the repositories behave (async, returns copies). Treat them as a real database client. Orders for **different** accounts should not block each other.

The last tests in `orders.test.js` cover this.

### Task 4: Tests

The test suite you were given is not complete. Add tests for any edge cases you think are missing.

---

## Bonus (optional, pick any)

- **Idempotency:** support an `Idempotency-Key` header on `POST /orders`, so that a retried request doesn't create a second order.
- **Limit orders:** `type: "LIMIT"` with a `limitPrice`. A limit order fills only if the current price is at or better than the limit. Otherwise it is stored as `PENDING`.
- **Quote locking:** `POST /quotes` returns a quote ID that's valid for 10 seconds. Then `POST /orders` with `quoteId` fills at exactly that price, or is rejected if the quote has expired.
- **Exposure limit:** reject an order if it would take an account's total exposure in any single currency above a configurable cap.

---

## Rules

- You can add dependencies if you can justify them, but you shouldn't need any.
- **Don't change the existing tests** so that they pass. If you think a test is wrong, explain why in your notes.
- Keep the existing layering: routes → services → repositories.

## What to submit

1. Your code (a git repo or a zip without `node_modules`).
2. A short `NOTES.md` that covers:
   - the root cause of each bug in Task 1
   - how your solution to Task 3 works, and how it would change if you ran **several instances** of this service behind a load balancer with a real database
   - anything you'd improve with more time

## How you'll be evaluated

- **Correctness:** the tests pass, and the money arithmetic is right.
- **Understanding:** you fix bugs at their root cause, not around the symptom.
- **Async and concurrency:** you understand the event loop, promises, and race conditions.
- **Code quality:** the code is readable, errors are handled consistently, and it fits the existing style.
- **Communication:** your `NOTES.md` is clear about trade-offs.
