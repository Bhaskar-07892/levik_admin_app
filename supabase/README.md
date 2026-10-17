# Levik backend (Supabase / Postgres)

This is the database backend for the Levik Rewards pilot. It is plain Postgres 17 on Supabase:

- **Tables:** typed, with database constraints.
- **Security:** row-level security (RLS) on every table.
- **Business rules:** written as SQL functions. The admin app and the mobile app call them with `supabase.rpc()`.

It mirrors the offline demo's TypeScript model and rules (`types/`, `lib/mock-api/rules.ts`, `lib/mock-api/services.ts`). Enum labels match the TypeScript string unions, so rows map onto the existing UI without translation.

```
supabase/
  config.toml                 local Supabase config (phone OTP enabled, test OTPs for demo numbers)
  migrations/
    …01_core_schema.sql       enums, tables, constraints, append-only ledger/audit, balances view
    …02_rules.sql             helpers + checks: scan_checks, invoice_checks, invoice_incentive, scheme progress
    …03_admin_actions.sql     approve/reject/flag, invoices, redemptions, schemes, adjustments, tickets
    …04_app_actions.sql       mobile app: register, KYC, submit_scan, submit_invoice, request_redemption, …
    …05_security.sql          grants + RLS policies
  seed.sql                    generated demo data (npm run db:seed:generate) — local/dev only
  tests/
    rules.test.sql            78 checks: rules, double-credit guards, RLS per role
    run-local.sh              runs migrations + seed + tests on a throwaway local Postgres 17
```

## Guarantees enforced by the database

| Rule | How it is enforced |
| ---- | ------------------ |
| Each scan, invoice or redemption moves points at most once | Partial unique indexes on `points_ledger`, plus a row lock and status check in each function |
| A serial code is credited once | Unique index on approved `scans.submitted_code` |
| Balances are always correct | They are never stored. The `points_balances` view derives them from the ledger. |
| The ledger, audit log and status history cannot be altered | `BEFORE UPDATE/DELETE` triggers raise errors, even for the table owner |
| No overdraft from concurrent approvals | A per-user transaction-scoped advisory lock wraps every balance-changing call |
| Reward stock never goes below zero | `CHECK (stock >= 0)`, plus a row lock in each function |
| Statuses only change through audited functions | No `UPDATE` grant on status columns. Admins can edit catalogue and profile columns directly, and a trigger audits those edits. |
| Participants only see their own data | RLS on every table. The plumber app's store directory is a filtered view that exposes no GSTIN or email. |
| No full Aadhaar numbers | Only the masked reference (`XXXX XXXX 1234`) is accepted (CHECK constraint) |

## Run the tests (no Docker needed)

```bash
npm run db:test
```

This needs a local Postgres 17. For example, `brew install postgresql@17` on macOS. Set `PG_BIN` if it is installed somewhere unusual.

The runner creates a throwaway cluster and loads a minimal stand-in for Supabase's `auth` schema (`tests/supabase_stub.sql`). It then applies every migration and the seed, and runs the 78 checks.

## Run the full local Supabase stack (needs Docker)

```bash
npx supabase start      # Postgres, Auth, API, Studio at http://127.0.0.1:54323
npx supabase db reset   # re-applies migrations + seed.sql
```

The seed creates these local logins:

- **Admin:** `admin@levik.demo` / `LevikDemo@123`.
- **Plumber:** Ramesh Kumar, phone `+91 98290 11234`, OTP `123456`.
- **Retailer:** Sharma Sanitary Store, phone `+91 98290 41127`, OTP `123456`.
- **New user:** phone `+91 99000 11122`, OTP `123456`, for testing registration.

Phone login also needs an SMS provider enabled in `config.toml`, even when you only use the test OTPs.

## Set up the pilot project

1. **Create the project.** In the Supabase dashboard, create a project in the **Mumbai (`ap-south-1`)** region, on the Pro plan. Free projects pause when idle.
2. **Push the migrations.** Do **not** run `seed.sql` against the pilot project.

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. **Create the first admin.** Under Authentication → Users → *Add user*, add the admin by email. Then run this in the SQL editor:

   ```sql
   insert into public.admins (user_id, name, email)
   select id, 'Admin Name', email from auth.users where email = 'admin@yourcompany.com';
   ```
4. **Turn on phone login.** Under Authentication → Providers → Phone, enable phone sign-in and configure an SMS provider. For India, use MSG91 through the *Send SMS* auth hook, or Twilio. Register the OTP template on the DLT portal first.
5. **Load the real catalogue and rewards.** Insert products and rewards as the admin, through the admin app or the dashboard.
6. **Configure the apps.** Give both apps `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never ship the service-role key to a client.

## Function reference (`supabase.rpc(name, args)`)

**Admin.** Every function checks the caller is in `public.admins`.

- **Scans:** `approve_scan(p_scan_id, p_note?)` returns `{ points, ledger_txn_id, scheme_awards[] }`. Also `reject_scan(p_scan_id, p_reason)` and `flag_scan(p_scan_id, p_reason)`.
- **Invoices:** `approve_invoice(p_invoice_id)` returns the same shape. Also `reject_invoice`, `request_invoice_info` and `start_invoice_review`.
- **Redemptions:**
  - `approve_redemption(p_redemption_id)`.
  - `update_redemption_status(p_redemption_id, p_next, p_reason?)`. Cancelling or failing after approval refunds once.
- **Points and stock:** `adjust_points(p_user_id, p_amount, p_reason)` and `adjust_reward_stock(p_reward_id, p_delta, p_reason)`.
- **Network:** `set_plumber_verification`, `set_plumber_account_status`, `review_retailer_application` and `set_retailer_account_status`.
- **Schemes:** `activate_scheme`, `pause_scheme` and `complete_scheme`. Create and edit drafts with plain `insert` / `update` on `schemes`.
- **Support:** `update_ticket(p_ticket_id, p_status, p_note?)`.
- **Read helpers:** `scan_checks`, `invoice_checks`, `invoice_incentive`, `redemption_checks` and `scheme_participants`.

**Mobile app.** The caller signs in with phone OTP.

- **Registration:** `register_plumber(...)` and `register_retailer(...)`. Each links an existing pre-registered row by mobile number, or creates a *Pending* one. Plumbers then call `submit_plumber_kyc(p_aadhaar_last4)`.
- **Plumbers:** `submit_scan(p_product_id, p_serial, p_retailer_id?, p_invoice_number?, p_site_location?, p_photo_path?)`. It is rate-limited by `settings.max_daily_scans_per_plumber`.
- **Retailers:** `submit_invoice(p_invoice_number, p_invoice_date, p_buyer_name, p_lines jsonb, p_document_path?)` and `report_inventory(p_product_id, p_quantity)`.
- **Redemptions (both roles):**
  - `request_redemption(p_reward_id, p_delivery_address)`. Points already promised to other open requests are counted against the balance.
  - `cancel_my_redemption(p_redemption_id)`.
- **Support (both roles):** `raise_ticket(...)`.
- **Read helpers:** `my_scheme_progress()`, and select from `store_directory`, `points_balances`, `scans`, `invoices`, `redemptions` and `points_ledger`. RLS returns only the caller's rows.

## Not done yet

- **The admin app still uses the localStorage mock.** The next step is to swap `lib/mock-api/queries.ts` / `services.ts` for Supabase calls (keeping their signatures) and replace the demo session with Supabase Auth.
- **No Storage buckets yet.** Invoice documents and installation photos need buckets with policies; `scans.photo_path` and `invoices.document_path` are already in place.
- **No KYC provider integration** (Surepass, Signzy or IDfy). Plan to run it as an Edge Function that calls `set_plumber_verification` with the service role.
- **No database types for the frontend yet.** Generate them with `npx supabase gen types typescript --linked > types/database.ts` once a project is linked.
