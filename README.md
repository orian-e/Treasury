# Treasury — Shared Expense App

A full-stack web application for tracking and settling shared expenses within groups. Built with TypeScript, React, and MongoDB.

---

## Project Structure

```
shared-expense-app
├── backend/
│   └── src/
│       ├── controllers/     # auth, expense, group, user
│       ├── middleware/      # JWT auth guard
│       ├── models/          # Mongoose schemas (expense, group, user)
│       ├── routes/          # auth, expense, group, user
│       ├── types/
│       └── utils/           # Winston logger
├── frontend/
│   └── src/
│       ├── components/      # UI components (expense form, settlement panel, etc.)
│       ├── hooks/           # useApi, useAuth, useAutoFill
│       ├── pages/
│       ├── services/        # API layer (expense, group, user)
│       ├── styles/          # SCSS + MUI theme
│       ├── tests/           # unit tests (components + utils)
│       └── utils/           # balance calculations, currency helpers, API client
├── e2e/                     # Playwright end-to-end tests
├── docker-compose.yml
├── docker-compose.test.yml
└── playwright.config.ts
```

---

## Features

### Authentication
- Register and log in with email and password (bcrypt hashing, JWT with 7-day expiry)

### Groups
- Create a group and share its invite code with others to join
- Leave a group at any time; only the creator can update or delete it
- Two user types within a group:
  - **Registered users** — have an account and can log in
  - **Guest users** — name-only entries added by a group member for expense tracking (no login)

### Expenses
- Add, edit, and delete expenses within a group
- Choose who paid (single or multiple payers) and how to split the cost:
  - **Equal** — divided evenly among selected members
  - **Percentage** — each member owes a defined percentage
  - **Custom amount** — explicit amount per person
- Assign a date and currency per expense

### Settlements
- Balances and settlement suggestions are calculated per currency using a greedy debt-minimisation algorithm (minimises the number of transactions)
- Supported currencies: EUR, USD, ILS, GBP, JPY

### Other
- Responsive UI — works on desktop and mobile, with horizontal scrolling for wide tables
- Rate-limited API (express-rate-limit)

---

## Currency Support

All expenses and balances are tracked per currency. There is **no automatic currency conversion** — each currency is settled independently.

---

## Testing

The project uses a layered testing strategy. All three layers run in Docker, so
Node does not need to be installed locally. Every command below requires
`backend/.env.test` to exist (see [Setup](#setup)).

**Frontend unit tests** (Jest + React Testing Library):
```bash
docker compose run --rm frontend npm run test:coverage
```
Components and utils. Touches no database.

**Backend integration tests** (Jest + Supertest):
```bash
docker compose -f docker-compose.test.yml run --rm --no-deps backend \
  bash -c "npm install && npm test"
```
Runs against the `-test` database and clears it before and after each run.

> With Node 22 installed locally you can instead run `cd backend && npm install && npm test`.

**End-to-end tests** (Playwright — Chromium only):
```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```
This seeds the `-test` database, starts the backend and frontend, waits for both,
then runs the suite. On completion the other containers are torn down and report
`exit code 1` — that is `--abort-on-container-exit` doing its job, not a failure.
Check the `e2e-runner` result. The HTML report is written to `playwright-report/`.

E2E tests cover auth flows, group management, expense creation/editing, and settlement calculations.

### Seed data

`backend/scripts/seed.ts` populates a database with fixtures covering the edge
cases worth testing against — multi-payer expenses, several currencies, guest
users, RTL/Hebrew names, and accented names.

```bash
# Seed the test database (NODE_ENV=test -> .env.test)
docker compose -f docker-compose.test.yml run --rm --no-deps backend \
  bash -c "npm install && npm run seed"

# Seed the development database for demos (NODE_ENV=development -> .env.development)
docker compose run --rm --no-deps backend \
  bash -c "npm install && npm run seed:dev"
```

Seeded accounts log in with the password `password123`.

> **The seed deletes all users, groups and expenses before inserting.** `npm run seed`
> only targets a database whose name contains `-test`. Seeding any other database
> requires the explicit `--allow-non-test` flag, which `npm run seed:dev` passes —
> so `seed:dev` will overwrite whatever is in your development database.

---

## Security And Demo Availability

This repository is intended to be reviewed as source code and through recorded demo media. A public live deployment URL is intentionally not provided.

Real environment files are excluded from Git. Use the `.env.example` files as templates only, and never commit local `.env`, `.env.*`, database credentials, JWT secrets, or generated reports.

This repository is published as a single-commit snapshot of the codebase rather than the full development history.

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier is sufficient),
  with **two databases** — one for development and one for tests. They can live in the
  same cluster; the test database's name must contain `-test`.

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Treasury
   ```

2. **Set up environment variables:**

   ```bash
   cp backend/.env.example backend/.env.development
   cp backend/.env.example backend/.env.test
   cp frontend/.env.example frontend/.env
   ```

   Edit `backend/.env.development` with your values:
   - `JWT_SECRET` — a random string of at least 32 characters
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `CORS_ORIGIN` — your frontend URL (default: `http://localhost:3000`)

   Then edit `backend/.env.test` the same way, but point `MONGODB_URI` at a
   **separate database** — the same cluster is fine, just a different database
   name. **The database name must contain `-test`** (e.g. `shared-expense-app-test`);
   `backend/tests/setup.ts` refuses to connect otherwise, and `npm run seed`
   refuses to wipe it. This guard exists because the test suites and the seed
   script both delete all users, groups and expenses before running.

   `backend/.env.test` is required by `docker-compose.test.yml` — without it,
   any `docker compose -f docker-compose.test.yml` command fails immediately.

   The frontend `.env` default values work as-is for local Docker development.

3. **Start the application:**
   ```bash
   docker compose up --build
   ```

4. **Access the app:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

---

## Technologies Used

| Layer | Stack |
|---|---|
| Backend | TypeScript, Node.js, Express, Mongoose, bcryptjs, jsonwebtoken, Winston, express-rate-limit |
| Frontend | React, TypeScript, Material-UI (MUI), React Router, SCSS, date-fns |
| Database | MongoDB Atlas |
| Testing | Jest, React Testing Library, Supertest, Playwright |
| Infrastructure | Docker, Docker Compose |

---

## Limitations

- **No currency conversion** — balances in different currencies are settled separately; cross-currency settlement is not supported.
- **Settlements are not persisted** — they are recalculated on the client each time from the raw expense data.
- **Legacy single-payer field** — the `payerId` field coexists with the newer `payers[]` array for backward compatibility. A database migration is needed to fully remove it.
- **Admin role not implemented** — the `isAdmin` flag exists in the user schema but there are no admin-specific routes or UI.
- **Group deletion removes all expenses** — there is no archival; deleting a group permanently deletes its expense history.
- **E2E tests run on Chromium only** — Firefox and WebKit are not currently enabled in the Playwright config.
