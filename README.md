# Money Manager — Frontend

A lightweight React + Vite frontend for the Money Manager application. This repository contains the TypeScript-based UI used to view, create, and manage budgets, transactions, and accounts.

Key goals:
- Fast local development with Vite
- Type-safe code using TypeScript
- Simple, component-driven UI built with React

Tech stack
- React
- TypeScript
- Vite
- CSS
- Cloudflare Workers / Pages (optional deployment target)

Features
- View account balances and transaction history
- Create, edit, and remove transactions
- Categorize transactions and track spending by category
- Responsive design for desktop and mobile

Getting started

Clone the repo and install dependencies:

```bash
git clone https://github.com/chrisferbia/money-manager-fe.git
cd money-manager-fe
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

Available scripts
- npm run dev — start Vite dev server
- npm run build — build production assets
- npm run preview — preview the production build locally
- npm run lint — run ESLint (if configured)
- npm test — run all unit and integration tests once

## Testing and regression checks

Regression tests check that previously fixed bugs do not return. The suite uses Vitest, React Testing Library, and jsdom. API calls are mocked: you do not need a running backend, development server, or real account data to run these tests.

Run commands from the frontend directory. For this Windows checkout:

```powershell
cd C:\Users\User\Documents\repo\money-manager-fe
```

On another machine, use the path to your `money-manager-fe` checkout. Install dependencies with `npm ci` on a fresh checkout or after pulling dependency changes.

### Run all tests

```bash
npm test
```

This runs all test files once and exits. A successful run reports all tests as `passed` and exits with code 0. If a test fails, Vitest prints the test name, file, and expected versus actual result. The summary shows the current number of tests, which grows as coverage is added.

### Run regression tests or one file

Run the refresh, date-filter, and API-recovery regression files together:

```bash
npm test -- tests/refresh.test.tsx tests/query-dates.test.ts tests/api-client.test.ts
```

Run only the transaction unit tests:

```bash
npm test -- tests/transactions.test.ts
```

To run one named test, use `-t` with all or part of its name:

```bash
npm test -- tests/refresh.test.tsx -t "opens and saves two consecutive transactions"
```

### Watch tests while editing

```bash
npx vitest
```

Vitest stays open and reruns affected tests when files change. Press `q` to quit, or `Ctrl+C` to stop it. You can also watch one file with `npx vitest tests/transactions.test.ts`.

### What each test file covers

| File | Coverage |
| --- | --- |
| `tests/transactions.test.ts` | Unit tests for validation, transfers, IDR rounding, payloads, editing, date round-trips, and sorting |
| `tests/actions.test.tsx` | Account and category action tests for create/edit payloads, validation, save failures, deletion confirmation, pending state, and targeted refreshes |
| `tests/refresh.test.tsx` | App integration tests for caching, filtering, modal focus, consecutive transactions, balance refreshes, request races, and clearing report dates |
| `tests/query-dates.test.ts` | Local-day boundaries for transaction and report queries, including year and leap-year boundaries |
| `tests/api-client.test.ts` | Recovery after runtime-config failures and sharing configuration requests |

The test configuration sets the timezone to `Asia/Jakarta` so date checks produce consistent results on local machines and CI. These tests use a simulated browser and mocked dialog methods; they do not replace checking native dialogs and mobile layouts in a real browser.

### Before merging or deploying

Run each check and resolve failures before continuing:

```bash
npm test
npm run lint
npm run build
```

These commands validate the code and create a local production build. They do not deploy the application. When fixing another bug, add a test that reproduces it in `tests/` using a `.test.ts` or `.test.tsx` filename so `npm test` picks it up automatically.

Environment
The deployed frontend reads its backend URL from `/runtime-config.json`. The Worker creates that response from its `BACKEND_URL` runtime variable, so the same build can be deployed to multiple Workers.

For each Worker, go to **Settings > Variables and Secrets > Runtime variables and secrets** and add:

```text
Name:  BACKEND_URL
Type: Text / Variable
Value: https://your-backend.example.com
```

Use the backend origin or path prefix that should be followed by `/accounts`, `/categories`, and the other API paths. Do not include credentials, query parameters, or a fragment. `BACKEND_URL` is not a secret: it is intentionally returned to the browser. Do not put API keys or passwords in it.

For local Worker development, create `.dev.vars` using `.dev.vars.example` as a reference. Alternatively, set `VITE_API_URL` locally; it is used only by `npm run dev` and is not used by production builds.

Deployment
Build and deploy the Worker with:

```bash
npm run build
npm run deploy
```

For Cloudflare Workers Builds, use `npm run build` as the build command and `npm run deploy` as the deploy command. Configure `BACKEND_URL` under the Worker's runtime variables, not under **Build variables and secrets**. Build variables are only available while compiling the application and cannot provide a runtime Worker binding. The `keep_vars` setting in `wrangler.json` preserves dashboard-configured plaintext variables during automatic deployments.

Each Worker can use a different `BACKEND_URL` without rebuilding the frontend. The Worker name in each deployment must also match the Wrangler configuration used for that deployment.

Direct backend requests
The Worker does not proxy API requests. After loading the runtime configuration, the browser sends requests directly to `BACKEND_URL`. Therefore, configure the backend CORS policy to allow every frontend Worker origin, for example each `https://<frontend-worker>.workers.dev` URL. A backend URL or API credential cannot be used as a browser secret.

Contributing
Contributions are welcome. Please open issues or PRs for fixes and improvements.

License
Specify your project license here (for example, MIT).
