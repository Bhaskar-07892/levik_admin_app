# Levik Admin — client demo MVP

The admin portal for the **Levik Rewards Programme**. Levik employees use it to manage plumbers and retailers, verify product scans and sales invoices, credit points, run schemes and fulfil reward redemptions.

This is a **demo build**. All data is mock data. It is seeded into the browser's `localStorage` and changed through a typed mock transaction service. There is no backend, database, real authentication or third-party integration.

## Quick start

Requires Node.js 20.9+ (tested on Node 25).

```bash
npm install
npm run dev
```

Then open http://localhost:3000. You are redirected to the login page.

### Demo login

| Field    | Value              |
| -------- | ------------------ |
| Email    | `admin@levik.demo` |
| Password | `LevikDemo@123`    |

The login page also has a **Fill demo credentials** button. This is a simulated session stored in `localStorage`. It is **not** production-secure authentication.

## Scripts

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start the development server                               |
| `npm run build`        | Production build                                           |
| `npm start`            | Serve the production build                                 |
| `npm run typecheck`    | Strict TypeScript check                                    |
| `npm run lint`         | ESLint (Next.js core-web-vitals + TypeScript rules)        |
| `npm run verify:rules` | Runs the business-rule integrity checks against the mock service in Node |

## Resetting demo data

Go to **Settings → Demo data → Reset Demo Data** and confirm. This discards every change made in this browser and restores the original seed. You stay signed in.

The seed has a version number (`DEMO_DATA_VERSION` in `lib/mock-data/seed.ts`). When you bump it, browsers holding older data are re-seeded automatically on their next load.

## Client demo script

All four scenarios work on fresh seed data. Reset the demo data before presenting.

**A. Plumber earns points**

1. Open **Dashboard** and note *Points issued*.
2. Go to **Product Scans** → *Pending* → open **SCN-5007** (Ramesh Kumar, model 1012).
3. Review the plumber, product, proof of sale, verification checks and points calculation. This approval also completes the *Festive Fitter Challenge* target.
4. Click **Approve** and confirm. A toast confirms *350 pts + 1,000 pts scheme bonus*.
5. Open the plumber profile: the available balance goes from 4,080 to 5,430.
6. Open **Points Ledger**: the new *Product Scan* and *Scheme Bonus* credits are there.
7. Back on the **Dashboard**, *Points issued* and *Product scans pending* have updated.

Also try **SCN-5015**. Approval is blocked because the serial was already credited. Reject it with a reason.

**B. Retailer earns incentives**

1. Go to **Invoice Management** → open **INV-3009** (Sharma Sanitary Store).
2. Review the line items, eligibility, the 711-point incentive and the mock invoice document. This approval also completes the *Festive Retail Booster* target.
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

- **Demo login**: form validation, password visibility toggle, invalid-credential feedback, protected admin routes, and logout (recorded in the audit log).
- **Executive dashboard**:
  - 8 KPIs, sales trend, scan trend by status, and points earned vs redeemed, all derived from the records.
  - Scheme performance, recent scans, pending invoice queue, recent redemptions and quick actions.
  - Period filter (7D / 30D / 90D / All).
- **Plumbers**:
  - Searchable, filterable, paginated directory.
  - Detail page with profile edit, KYC verify/reject (simulated Aadhaar), suspend/reactivate with a reason, manual points adjustment, and scan, ledger and redemption history.
- **Retailers**:
  - Directory with 30-day sales and target achievement.
  - Approve or reject pending applications, edit shop details, suspend/reactivate.
  - Invoices, reported inventory, schemes with progress, and incentive history.
- **Product catalogue**:
  - 21 models seeded from the Levik Bathware catalogue, with real model codes, dimensions and features, and photos extracted from the PDF.
  - Grid and table views, category and status filters, add and edit (React Hook Form + Zod), activate/deactivate, and a detail page.
- **Product scan verification**:
  - Tabs: All, Pending, Approved, Rejected, Flagged.
  - Deterministic verification checks: catalogue code, reward eligibility, KYC, account status, proof of sale from an approved retailer, duplicate serial, and whether the invoice lists the model.
  - Approve, reject (reason required) or flag.
- **Invoice management**:
  - Line-item review with per-line eligibility and the points calculation shown before approval.
  - Mock invoice document, duplicate-number check.
  - Approve, reject, request more information, start review.
- **Rewards catalogue**: add/edit, activate/deactivate, stock adjustment with a reason (stock never goes negative), and redemption history per reward.
- **Redemptions**: Requested → Approved → Processing → Dispatched → Delivered. Cancelled and Failed refund once and restore stock. Courier, tracking and voucher references are mock values.
- **Schemes**:
  - Multi-step create and edit form, draft/scheduled/active/paused/completed lifecycle.
  - Eligible participants with progress against targets, and a one-time bonus when a qualifying approval crosses the target.
- **Inventory**: retailer-reported stock with low-stock and out-of-stock indicators, filters, and quantity updates.
- **Points ledger**: an append-only shared ledger with role, source and credit/debit filters. Each transaction's detail links to the related scan, invoice, redemption or scheme.
- **Reports**: verified sales, scans by status, points issued vs redeemed, top retailers, top-scanned products and scheme performance, each with a period filter and CSV export of the filtered data.
- **Support tickets**: status workflow and internal notes.
- **Audit logs**: append-only, filterable, with CSV export.
- **Settings**: admin display name, programme name, retailer incentive rate, low-stock threshold, notification preferences, and Reset Demo Data.
- **Shell**:
  - Collapsible sidebar sections with pending-count badges, and breadcrumbs.
  - Global search (press `/`) across plumbers, retailers, products, scans, invoices, redemptions and schemes.
  - Notifications derived from the pending work queues, a profile menu with role and logout, and a responsive mobile drawer.

## Architecture

```
app/
  (auth)/login/            demo sign-in
  (admin)/…                one route per module; page.tsx files are Server Components
                           that render a client view (data lives in the browser)
components/
  layout/                  shell: sidebar, top bar, global search, breadcrumbs
  data-table/              reusable sortable/paginated table + toolbar
  shared/                  badges, KPI cards, dialogs (confirm / reason), timeline, …
  forms/ charts/ ui/       form helpers, Recharts wrapper, shadcn/ui (Base UI) primitives
  <feature>/               feature views (plumbers, scans, invoices, …)
lib/
  mock-data/               typed, deterministic seed (+ catalogue products)
  mock-api/
    store.ts               in-memory snapshot + atomic commit + localStorage persistence
    rules.ts               pure business rules (checks, points, scheme progress, balances)
    queries.ts             read services: listPlumbers(), getDashboardMetrics(), …
    services.ts            transaction service: approveScan(), approveInvoice(), …
  storage/                 browser-storage wrapper + simulated session
  validations/             Zod schemas
types/                     domain models (Plumber, Retailer, Product, ProductScan, …)
scripts/verify-rules.ts    business-rule integrity checks
```

### Data integrity rules

Every mutation is a single `commit()`. It applies the change to a copy of the database, updates every affected record (status, ledger, balances, stock, scheme awards, audit) and then swaps the copy in. Page components never change points themselves.

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

`npm run verify:rules` checks all of these.

### Sample programme rules (demo values, not official Levik rules)

- **Plumber scan points:** set per product (for example, model 1012 earns 350 pts).
- **Retailer incentive:** 1 point per ₹100 of pre-GST value on active, reward-eligible products. You can change this in Settings.
- **Reward point thresholds and MRPs:** sample values.
- **Product data:** model codes, dimensions and features come from the Levik catalogue. Nothing else is invented.

## Known limitations

- **No backend.** Data lives in one browser's `localStorage`, so it is not shared across browsers or devices. Browser storage gives no concurrency or financial-grade transaction guarantees.
- **Demo authentication only.** There is a single admin role and no permission management.
- **No real integrations.** Aadhaar/KYC, SMS/email, OCR, ERP, courier and voucher providers are all simulated, and invoice documents are generated previews.
- **Sales window.** "Sales · 30 days" uses a rolling 30-day window, not calendar months.
- **Scheme bonuses are not retroactive.** They are evaluated when a qualifying scan or invoice is approved. Activating a scheme does not award bonuses retroactively.
- **Next.js Instant Navigation validation is limited to explicit opt-ins** (`next.config.ts`). Admin pages render client-side from browser storage behind a skeleton.

## Moving to production

Swap the bodies in `lib/mock-api/services.ts` and `queries.ts` for API calls and keep the signatures, and replace `lib/storage/session.ts` with a real auth provider. The ledger-derived balances and single-transaction approvals should move server-side into database transactions.
