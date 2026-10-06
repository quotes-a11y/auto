# Elevated Operations — Version 1

Standalone business software for Elevated Automatic Door Parts.

Application: https://elevated-operations-production.up.railway.app/

The existing store is not used or changed. This application has its own PostgreSQL database, accounts, sessions, backend and interface.

## Start using it

1. Use the private owner setup link supplied in the handover. Create your own password (minimum 12 characters). The link can create only the first owner account.
2. Open Settings. Add business address, phone, email and tax registration numbers. Configure applicable taxes; the starting database deliberately has no assumed tax rates.
3. Add customers, contractors, suppliers and products. Link primary suppliers from product details.
4. Create an estimate. Mark it Accepted, then create an invoice or sales order without re-entering its lines.
5. Issue invoices before recording payment. Partial payments update the remaining balance automatically.
6. Create supplier POs manually or from an accepted estimate, approved sales order or issued invoice. Receive supplier parts to increase inventory. Record sales order shipment to decrease it.

There are no sample business records in the deployed database. Verification data is rolled back before the server starts.

## Available in this version

- Owner setup, secure login/logout and six defined roles.
- Customer/contractor database and pricing tiers; supplier and product CRUD.
- Multiple supplier sources, supplier SKUs, supplier costs, lead times, primary sourcing.
- Estimates, invoices, supplier purchase orders and sales orders.
- Draft editing, duplication, status transitions, PDF download and printable PDFs.
- Snapshot descriptions, SKUs, prices, costs, discounts, tax components and party information.
- Estimate-to-invoice / sales order conversion and supplier PO grouping by primary supplier.
- Invoice payments with remaining balances, partial/paid status and retry protection.
- Partial PO receiving, retry protection, shipment recording and inventory movements.
- On-hand, reserved, available, incoming and backordered inventory figures.
- Projects with linked documents and private invoiced profitability.
- Universal search including customer PO references.
- Monthly/yearly sales, product/brand/customer profitability, supplier PO spending, outstanding balances, conversion rate and CSV export.
- Configurable taxes, tax exemption, document currency and saved CAD exchange rates.
- Configurable business information and email templates; append-only audit history.
- PDF email delivery adapter, with persisted Pending/Sent/Failed results and failure messages.

## Connections and remaining work

| Item | Current state |
| --- | --- |
| Owner account | Awaiting the owner's private setup |
| PostgreSQL | Deployed on a persistent Railway volume; startup transactions and PDF checks verified |
| Email | Adapter and success/failure handling tested; a verified sender and provider key are not configured |
| Hosting plan | Account subscription/continued paid capacity has not been verified; do not rely on trial credits for production |
| Backups | Backup/restore scripts and recovery strategy included; automated backup scheduling has not been enabled or restore-drilled against hosted PostgreSQL |
| Browser QA | Live owner setup screen inspected; automated DOM form workflow tested |
| Mobile | Responsive styles implemented; physical-device/browser viewport QA remains |
| QuickBooks / website API | Not connected; external mapping schema and authenticated internal API provide a foundation |
| Variants, add-ons, multiple contacts | Relational schema ready; management UI and line selection are not implemented |
| Statements, reminders, automatic acceptance/view tracking | Later version; not implemented |
| Logo uploads, warehouses, supplier bills, refunds/credit notes | Later version; not implemented |
| Team administration | Create role-based accounts; self-service password recovery, MFA and account deactivation UI remain future work |

This is a functional first version, not a claim that all 43 sections of the long-term brief are complete. Complete paid-hosting and recovery setup before treating it as the sole record for live business accounts.

## Financial meaning

Revenue is the value of issued invoices before tax, not cash collected. Costs are saved product cost snapshots. Gross profit excludes freight, duties, labour, payment fees and overhead unless explicitly included in the entered cost. Supplier spending reports show issued PO commitments, not supplier bills paid. Foreign currency is normalized using the exchange rate saved on each document. Account reports are capped at 2,000 records; dashboard/report queries are designed for the first version and need pagination and aggregation work as volume grows.

Products use CAD catalog costs and prices. When quoting in foreign currency, enter the intended selling price in that currency; catalog cost snapshots are converted using the entered exchange rate. Automatic supplier PO generation currently requires supplier currency to match the source document. Mixed currencies require manual POs. Retail pricing uses list price; the other declared tiers use contractor price in this version. Custom per-account pricing is future work.

Draft edits retain the document number. Number sequences can have gaps when a draft is revised; numbers are never reused. Issued documents cannot have their lines edited. Duplicate them for a replacement draft; historical snapshots and audit entries remain unchanged.

## Source and deployment

- `src/db.ts`: PostgreSQL connection, transactions, migration/integrity checks, audit insertion.
- `src/auth.ts`: password hashing, sessions, CSRF, setup, login, role policy.
- `src/routes/`: catalog, documents, financial/inventory/report endpoints.
- `src/services/`: document business logic, money, PDFs, email, startup verification.
- `src/ui/`: five frontend source modules; assembled into `public/app.js`.
- `db/001_initial.sql`: versioned relational schema and settings.
- `tests/`: automated API/business workflow and DOM form tests.
- `scripts/`: build, deployment bundle, backup and restore helpers.

The maintainable source is modular. Railway currently receives a generated deployment bundle with compressed static assets; this is not the development source. Data is stored in PostgreSQL, never in browser storage or the function filesystem. A future Git-backed service can run the same modular source directly.

Secrets are in the hosting environment and are not included in this source package.

Developer commands:

```sh
npm ci
npm run check
npm test
npm start
npm run bundle
```

Local development needs PostgreSQL and environment configuration. Automated tests use an isolated embedded PostgreSQL engine; production startup additionally verifies real hosted PostgreSQL and rolls all verification data back.
