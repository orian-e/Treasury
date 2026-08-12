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

Docker is the only requirement. No MongoDB Atlas account, no `.env` file — the
test stack brings up its own throwaway database:

```bash
npm run test:unit      # frontend unit (Jest + React Testing Library)
npm run test:backend   # backend integration (Jest + Supertest)
npm run test:e2e       # end-to-end (Playwright, Chromium)
npm run test:clean     # stop the stack and drop its containers
```

Each wraps a `docker-compose.test.yml` command — see the `scripts` block in
`package.json`. The stack runs its MongoDB in memory and publishes no ports, so
it cannot reach a real database or collide with your dev app's ports. It also
pins its own Compose project name (`shared-expense-test`, against the dev
stack's `shared-expense-dev`), so `docker compose up` can keep running in
another terminal while the suites run. The Playwright report lands in
`playwright-report/`.

Run the suites one at a time. `test:e2e` uses `--abort-on-container-exit`, so
starting `test:unit` alongside it tears the e2e stack down mid-run (exit 137).

E2E tests cover auth flows, group management, expense creation/editing, and
settlement calculations. `npm run test:e2e` seeds the database from
[`backend/scripts/seed.ts`](backend/scripts/seed.ts) before starting the app,
and [`e2e/seeded-fixtures.spec.ts`](e2e/seeded-fixtures.spec.ts) asserts against
those fixtures — split amounts, per-currency balances, RTL names — so a change
that breaks an existing scenario fails there. The other specs register their own
users and do not depend on the seed.

**Adding a feature?** Put new fixtures in `backend/scripts/seed.ts` and new
assertions against them in `e2e/seeded-fixtures.spec.ts`; anything that needs to
create or edit data belongs in a spec that registers its own user.

To iterate on a single spec, leave the stack up and re-run just that test —
`e2e/` is mounted, so no rebuild is needed:

```bash
docker compose -f docker-compose.test.yml run --rm e2e-runner \
  npx playwright test -g "per currency"
```

Source changes to `backend/` or `frontend/` do need a rebuild; the `--build` in
the scripts above handles it.

These same commands run in CI on every push:
[`.github/workflows/tests.yml`](.github/workflows/tests.yml).

<details>
<summary>Running without Docker</summary>

With Node 22, `npm run install:all` once, then `npm --prefix frontend test` for
the unit suite. Playwright can drive an already-running app with
`npx playwright test --grep-invert @seeded` — the excluded specs need the seeded
database, which this path does not create.

The backend suite needs a MongoDB replica set, because the controllers wrap
every write in a transaction. Setting one up by hand is more work than just
using `npm run test:backend` above.

</details>

### Seed data

`backend/scripts/seed.ts` populates a database with fixtures covering the edge
cases worth testing against — multi-payer expenses, several currencies, guest
users, RTL/Hebrew names, and accented names.

```bash
# Seed the throwaway test database. npm run test:e2e already does this; run it
# directly to explore the fixtures by hand.
docker compose -f docker-compose.test.yml run --rm --build backend npm run seed

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

This codebase was published as a streamlined release to establish a fresh baseline for future features and community maintenance.

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier is
  sufficient) **to run the app**. Not needed to run the tests — the test stack
  ships its own disposable database, see [Testing](#testing).

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Treasury
   ```

2. **Set up environment variables:**

   ```bash
   cp backend/.env.example backend/.env.development
   cp frontend/.env.example frontend/.env
   ```

   Edit `backend/.env.development` with your values:
   - `JWT_SECRET` — a random string of at least 32 characters
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `CORS_ORIGIN` — your frontend URL (default: `http://localhost:3000`)

   The frontend `.env` default values work as-is for local Docker development.

   > This step is only needed to **run the app**. The test stack is
   > self-contained — see [Testing](#testing). `backend/.env.test` is optional:
   > create it only if you want the suites to run against your own database
   > instead of the disposable one, in which case the database name must contain
   > `-test`, because the suites and the seed script delete every user, group and
   > expense before running.

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
