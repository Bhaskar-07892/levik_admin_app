# Levik Admin

The admin portal for the **Levik Rewards Programme**. Levik employees use it to manage plumbers and retailers, verify product scans and sales invoices, credit points, run schemes and fulfil reward redemptions.

All data comes from the **[Levik API](https://github.com/shubhamjoshi99899/levik_-backend)** (NestJS + PostgreSQL). The portal holds no programme data of its own. It signs in with a real admin account, and every list, approval and report is a call to the API.

## Quick start

Requires Node.js 20.9+ (tested on Node 25) and a running Levik API.

1. Start the API (see its README). It runs on `http://localhost:4100` and seeds the demo data with `npm run db:seed`.
2. Install and start the portal:

```bash
cp .env.example .env.local
npm install
npm run dev -- -p 3020
```

Then open http://localhost:3020. You are redirected to the login page.

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4100` | API origin. The API must list the portal's origin in `CORS_ORIGINS`. |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN` | `true` | Shows the seeded demo account on the login page. Set it to `false` for real deployments. |

### Demo login

| Field    | Value              |
| -------- | ------------------ |
| Email    | `admin@levik.demo` |
| Password | `LevikDemo@123`    |

This account is seeded by the API for local and demo environments only.

## Orders and stock

- **Orders** lists every retailer's stock orders. Confirm, dispatch and mark delivered from an order's page. Delivery adds the stock to the retailer's inventory and issues the purchase invoice (PDF button).
- **Inventory** shows current stock and the full stock history across retailers.
- A **retailer's page** has their orders, the bills they issued to buyers, and their stock history.
- **Scan reviews** show whether the selected retailer confirmed or declined the sale.

## Deployment

The portal deploys to Vercel from GitHub: every push to `main` goes live, and other branches get preview URLs. GitHub Actions runs lint, typecheck and a production build on each push. Set `NEXT_PUBLIC_API_URL` to the hosted API in the Vercel project, and add the portal's URL to the API's `CORS_ORIGINS`. Full steps: [DEPLOYMENT.md](https://github.com/shubhamjoshi99899/levik_backend/blob/main/DEPLOYMENT.md) in the API repo.

## Scripts

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start the development server                               |
| `npm run build`        | Production build                                           |
| `npm start`            | Serve the production build                                 |
| `npm run typecheck`    | Strict TypeScript check                                    |
| `npm run lint`         | ESLint (Next.js core-web-vitals + TypeScript rules)        |
| `npm run api:types`    | Regenerates `lib/api/schema.d.ts` from the running API's OpenAPI document |
| `npm run db:test`      | (Supabase prototype) runs the database tests against a throwaway Postgres |
| `npm run db:seed:generate` | (Supabase prototype) regenerates `supabase/seed.sql` from the TypeScript demo seed |

## Resetting demo data

Reset the data on the API side by running `npm run db:reset` in `levik-api`. This restores the original seed for every user of that API. Sign in again afterwards: the reset also clears sessions.

## Client demo script

All four scenarios work on fresh seed data. Reset the API's demo data before presenting.

**A. Plumber earns points**

1. Open **Dashboard** and note *Points issued*.
2. Go to **Product Scans** → *Pending* → open **SCN-5007** (Ramesh Kumar, model 1012).
3. Review the plumber, product, proof of sale, verification checks and points calculation. This approval also completes the *Festive Fitter Challenge* target.
4. Click **Approve** and confirm. A toast confirms *350 pts + 1,000 pts scheme bonus*.
5. Open the plumber profile: the available balance goes from 4,080 to 5,430.
6. Open **Points Ledger**: the new *Product Scan* and *Scheme Bonus* credits are there.
7. Back on the **Dashboard**, *Points issued* and *Product scans pending* have updated.
8. Open **Product Catalogue** → *One-Piece Western WC 1012* → **QR labels** → **Generate labels**. Each unit gets its own signed QR serial. Download the A4 label sheet (PDF) or the CSV for a label printer.

Also try **SCN-5015**. Approval is blocked because the serial was already credited. Reject it with a reason.

**B. Retailer earns incentives**

1. Go to **Invoice Management** → open **INV-3009** (Sharma Sanitary Store).
2. Review the line items, eligibility, the 711-point incentive and the invoice preview. This approval also completes the *Festive Retail Booster* target.
3. Click **Approve**. The retailer receives 711 pts plus a 5,000 pts scheme bonus.
4. Open the retailer profile: the incentive balance, 30-day sales and target achievement have all updated.
5. In the **Points Ledger**, filter *Role = Retailers* to see the new entries.

Also try **INV-3010**. Approval is blocked by a duplicate invoice number. Reject it.

**C. Reward redemption**

1. Go to **Redemptions** → open **RDM-7004** (Rajesh Patel, Premium Plumbing Toolkit).
2. The eligibility checks confirm the balance (5,420 pts) and stock (12 units).
3. Click **Approve & deduct points**. The balance drops by 2,500 and stock goes to 11.
4. Mark it **Processing** and then **Dispatched**. The balance does not change again, and the ledger shows exactly one debit.
5. Open **Audit Logs** to see every step.

Also try **RDM-7006**. The refrigerator request is blocked for insufficient balance.

**D. Product and scheme setup**

1. **Product Catalogue** → **Add product**. Fill in the form and save.
2. **Schemes** → **Create scheme**. Work through the four steps: basics, eligibility and period (pick categories), target and incentive, review. Save as **Draft**.
3. On the scheme page click **Activate**. The scheme shows as *Active*, or *Scheduled* if its start date is in the future, in the schemes list.

## Features

- **Sign-in**: API authentication with form validation, password visibility toggle, invalid-credential feedback, protected admin routes, silent token refresh, and logout (which revokes the refresh token).
- **Executive dashboard**:
  - 8 KPIs, sales trend, scan trend by status, and points earned vs redeemed, all derived from the records.
  - Scheme performance, recent scans, pending invoice queue, recent redemptions and quick actions.
  - Period filter (7D / 30D / 90D / All).
- **Plumbers**:
  - Searchable, filterable, paginated directory.
  - Detail page with profile edit, KYC verify/reject (masked Aadhaar reference), suspend/reactivate with a reason, manual points adjustment, and scan, ledger and redemption history.
- **Retailers**:
  - Directory with 30-day sales and target achievement.
  - Approve or reject pending applications, edit shop details, suspend/reactivate.
  - Invoices, reported inventory, schemes with progress, and incentive history.
- **Product catalogue**:
  - 21 models seeded from the Levik Bathware catalogue, with real model codes, dimensions and features, and photos extracted from the PDF.
  - Grid and table views, category and status filters, add and edit (React Hook Form + Zod), activate/deactivate, and a detail page.
  - **QR labels**: generate batches of unique, signed serials per product, and download print-ready A4 PDF sheets or a CSV. Each batch shows how many labels are available, claimed and void.
- **Product scan verification**:
  - Tabs: All, Pending, Approved, Rejected, Flagged.
  - Verification checks evaluated by the API: genuine Levik label, catalogue code, reward eligibility, KYC, account status, proof of sale from an approved retailer, duplicate serial, whether the invoice lists the model, and QR signature.
  - The installation photo is shown when the plumber uploaded one.
  - Approve, reject (reason required) or flag.
- **Invoice management**:
  - Line-item review with per-line eligibility and the points calculation shown before approval.
  - Uploaded invoice document (or a preview generated from the line items), and the duplicate-number check.
  - Approve, reject, request more information, start review.
- **Rewards catalogue**: add/edit, activate/deactivate, stock adjustment with a reason (stock never goes negative), and redemption history per reward.
- **Redemptions**: Requested → Approved → Processing → Dispatched → Delivered. Cancelled and Failed refund once and restore stock. Courier, tracking and voucher references are entered by the admin.
- **Schemes**:
  - Multi-step create and edit form, draft/scheduled/active/paused/completed lifecycle.
  - Eligible participants with progress against targets, and a one-time bonus when a qualifying approval crosses the target.
- **Inventory**: retailer-reported stock with low-stock and out-of-stock indicators, filters, and quantity updates.
- **Points ledger**: an append-only shared ledger with role, source and credit/debit filters. Each transaction's detail links to the related scan, invoice, redemption or scheme.
- **Reports**: verified sales, scans by status, points issued vs redeemed, top retailers, top-scanned products and scheme performance, each with a period filter and CSV export of the filtered data.
- **Support tickets**: status workflow and internal notes.
- **Audit logs**: append-only, filterable, with CSV export.
- **Settings**: admin display name, programme name, retailer incentive rate, low-stock threshold, daily scan limit per plumber, notification preferences, and API connection status.
- **Shell**:
  - Collapsible sidebar sections with pending-count badges, and breadcrumbs.
  - Global search (press `/`) across plumbers, retailers, products, scans, invoices, redemptions and schemes.
  - Notifications derived from the pending work queues, a profile menu with role and logout, and a responsive mobile drawer.

## Architecture

```
app/
  (auth)/login/            sign-in against POST /auth/admin/login
  (admin)/…                one route per module; page.tsx files are Server Components
                           that render a client view (data is fetched with the admin's token)
components/
  layout/                  shell: session guard, sidebar badges, top bar, global search, breadcrumbs
  data-table/              table with server pagination/sorting (and local mode for small lists)
  shared/                  badges, KPI cards, dialogs, timeline, query states, uploaded-file viewer
  forms/ charts/ ui/       form helpers, Recharts wrapper, shadcn/ui (Base UI) primitives
  <feature>/               feature views (plumbers, scans, invoices, products + QR labels, …)
lib/
  api/
    schema.d.ts            generated from the API's OpenAPI document (npm run api:types)
    client.ts              openapi-fetch client, typed TanStack Query hooks ($api), file downloads
    auth.ts                admin session: in-memory access token, rotating refresh token
    errors.ts              ApiError (the API's error envelope) and user-facing messages
    hooks.ts               shared queries (settings, profile, notifications, status counts, options)
    types.ts               aliases for the generated response types
  hooks/                   usePagedList (page, debounced search, filters, sort), useDebouncedValue
  utils/                   formatting, periods/chart buckets, runAction (mutation + toast + refresh)
  validations/             Zod schemas for forms
  mock-data/               demo seed, used only by the Supabase prototype seed generator
types/                     shared enums and labels (statuses, categories)
```

### How the portal talks to the API

- **Types are generated, not hand-written.** `lib/api/schema.d.ts` comes from the API's OpenAPI document. Every request and response is checked against it at compile time.
- **Queries and mutations:**
  - Reads use `$api.useQuery(...)` (TanStack Query) with the API's own pagination, filters and sorting.
  - Writes go through `runAction`, which calls the API, shows a toast and refetches the queries on screen.
  - An approval changes balances, queues, dashboards and scheme progress at once, so everything visible refreshes.
- **Sessions:**
  - The access token (15 minutes) is kept in memory only.
  - The rotating refresh token is kept in localStorage, so a reload keeps you signed in.
  - A 401 triggers one silent refresh and a retry. Refreshes are serialised across tabs with the Web Locks API, so two tabs never present the same refresh token, which the API would treat as theft.
- **Files:** uploads (scan photos, invoice documents), label PDFs and CSV exports need the bearer token, so they are fetched as blobs.

### Data integrity rules

The portal enforces none of these itself. It shows the API's verification checks and calls the API's endpoints, and the API enforces every rule inside database transactions (see the API README):

1. **Balances are never stored.** Every plumber and retailer balance is derived from the points ledger.
2. **Scans:** only approved scans credit points, each scan at most once (`ledgerTxnId` guard), and rejected scans credit nothing.
3. **Invoices:** only approved invoices credit incentives, each invoice at most once. Duplicate invoice numbers block approval.
4. **Redemptions:**
   - Approval requires a sufficient balance, stock and an active account.
   - Points are deducted exactly once, at approval. Later status changes never deduct again.
   - Cancelling or failing after approval refunds once and restores stock.
5. **Stock:** reward stock can never go negative.
6. **Manual adjustments** require a reason, cannot overdraw a balance, and are audited.
7. **Scheme bonuses** are credited once per participant, when an approval inside the scheme window pushes them over the target.

The API's end-to-end test suite checks all of these, including concurrent approvals.

### Sample programme rules (demo values, not official Levik rules)

- **Plumber scan points:** set per product (for example, model 1012 earns 350 pts).
- **Retailer incentive:** 1 point per ₹100 of pre-GST value on active, reward-eligible products. You can change this in Settings.
- **Reward point thresholds and MRPs:** sample values.
- **Product data:** model codes, dimensions and features come from the Levik catalogue. Nothing else is invented.

## Known limitations

- **Single admin role.** There is no permission management yet.
- **External integrations are recorded manually.** Aadhaar/KYC, courier and voucher providers are not integrated. Admins enter references by hand. If no invoice document was uploaded, a preview is generated from the line items.
- **Sales window.** "Sales · 30 days" uses a rolling 30-day window, not calendar months.
- **Scheme bonuses are not retroactive.** They are evaluated when a qualifying scan or invoice is approved. Activating a scheme does not award bonuses retroactively.
- **Refresh token storage.** The refresh token is kept in localStorage. Moving it to an httpOnly cookie, behind a same-site API or BFF, would harden it against XSS.
- **Next.js Instant Navigation validation is limited to explicit opt-ins** (`next.config.ts`). Admin pages render client-side behind a skeleton.

## Supabase prototype

[`supabase/`](supabase/README.md) holds an earlier pilot backend: a Postgres schema with RLS and its own tests. The NestJS API replaces it, and the portal does not use it.
