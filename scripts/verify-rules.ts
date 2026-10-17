/**
 * Business-rule integrity checks for the mock transaction service.
 * Runs in Node against an in-memory copy of the seed (browser storage is unavailable there).
 *   npm run verify:rules
 */
import assert from "node:assert/strict";
import { pointsSummary } from "@/lib/mock-api/rules";
import * as svc from "@/lib/mock-api/services";
import { getDb, resetDemoDatabase } from "@/lib/mock-api/store";
import { getDashboardMetrics } from "@/lib/mock-api/queries";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}
const balance = (id: string) => pointsSummary(getDb(), id).available;
const ledgerFor = (type: string, id: string) => getDb().ledger.filter((t) => t.related?.type === type && t.related.id === id);
const throws = (fn: () => unknown, pattern: RegExp) => assert.throws(fn, pattern);

resetDemoDatabase();
console.log("Levik demo business rules");

check("seed balances are never negative", () => {
  for (const u of [...getDb().plumbers, ...getDb().retailers]) assert.ok(balance(u.id) >= 0, u.id);
});

check("approving a scan credits once, plus a one-time scheme bonus", () => {
  const before = balance("PLM-1001");
  const kpiBefore = getDashboardMetrics(getDb(), "30d").kpis.pointsIssued;
  const result = svc.approveScan("SCN-5007");
  assert.equal(result.points, 350);
  assert.equal(result.schemeAwards.length, 1);
  assert.equal(balance("PLM-1001"), before + 350 + 1000);
  assert.equal(ledgerFor("scan", "SCN-5007").length, 1);
  assert.equal(getDashboardMetrics(getDb(), "30d").kpis.pointsIssued, kpiBefore + 1350);
  throws(() => svc.approveScan("SCN-5007"), /already approved/);
  assert.equal(ledgerFor("scan", "SCN-5007").length, 1);
});

check("scans with blocking checks cannot be approved; rejection requires a reason and credits nothing", () => {
  throws(() => svc.approveScan("SCN-5015"), /Serial code not previously credited/);
  throws(() => svc.rejectScan("SCN-5015", ""), /rejection reason/i);
  const before = balance("PLM-1003");
  svc.rejectScan("SCN-5015", "Duplicate serial already credited");
  assert.equal(balance("PLM-1003"), before);
  assert.equal(ledgerFor("scan", "SCN-5015").length, 0);
});

check("approving an invoice credits the incentive once and awards the retailer scheme", () => {
  const before = balance("RTL-2001");
  const result = svc.approveInvoice("INV-3009");
  assert.equal(result.points, 711);
  assert.equal(result.schemeAwards[0]?.id, "SCH-401");
  assert.equal(balance("RTL-2001"), before + 711 + 5000);
  throws(() => svc.approveInvoice("INV-3009"), /already approved/);
  assert.equal(ledgerFor("invoice", "INV-3009").length, 1);
});

check("duplicate invoice numbers are blocked; rejected invoices award nothing", () => {
  throws(() => svc.approveInvoice("INV-3010"), /Invoice number is unique/);
  const before = balance("RTL-2002");
  svc.rejectInvoice("INV-3010", "Duplicate invoice number");
  assert.equal(balance("RTL-2002"), before);
});

check("redemption deducts exactly once across fulfilment status changes", () => {
  const before = balance("PLM-1004");
  const stock = getDb().rewards.find((r) => r.id === "RWD-6004")!.stock;
  svc.updateRedemptionStatus("RDM-7004", "Approved");
  svc.updateRedemptionStatus("RDM-7004", "Processing");
  svc.updateRedemptionStatus("RDM-7004", "Dispatched");
  svc.updateRedemptionStatus("RDM-7004", "Delivered");
  assert.equal(balance("PLM-1004"), before - 2500);
  assert.equal(getDb().rewards.find((r) => r.id === "RWD-6004")!.stock, stock - 1);
  assert.equal(ledgerFor("redemption", "RDM-7004").length, 1);
  throws(() => svc.approveRedemption("RDM-7004"), /Only requested/);
});

check("insufficient balance blocks approval", () => {
  throws(() => svc.approveRedemption("RDM-7006"), /Sufficient points balance/);
  assert.equal(ledgerFor("redemption", "RDM-7006").length, 0);
});

check("cancelling after approval refunds once and restores stock", () => {
  const before = balance("RTL-2005");
  const stock = getDb().rewards.find((r) => r.id === "RWD-6003")!.stock;
  svc.updateRedemptionStatus("RDM-7007", "Cancelled", "Customer changed reward");
  assert.equal(balance("RTL-2005"), before + 2000);
  assert.equal(getDb().rewards.find((r) => r.id === "RWD-6003")!.stock, stock + 1);
  throws(() => svc.updateRedemptionStatus("RDM-7007", "Cancelled", "again please"), /Cannot move/);
});

check("reward stock can never go negative", () => {
  throws(() => svc.adjustRewardStock("RWD-6008", -99, "Write-off test"), /below zero/);
  svc.adjustRewardStock("RWD-6008", -3, "Damaged in transit");
  assert.equal(getDb().rewards.find((r) => r.id === "RWD-6008")!.stock, 0);
});

check("manual adjustments need a reason and cannot overdraw", () => {
  throws(() => svc.adjustPoints("PLM-1006", 100, ""), /reason/i);
  throws(() => svc.adjustPoints("PLM-1006", -999999, "Clawback test"), /negative/);
  const before = balance("PLM-1006");
  svc.adjustPoints("PLM-1006", 250, "Goodwill credit");
  assert.equal(balance("PLM-1006"), before + 250);
});

check("schemes: create as draft, activate, pause", () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate(), 23, 59).toISOString();
  const scheme = svc.createScheme({
    name: "Test drive",
    description: "Integration test scheme",
    role: "retailer",
    startDate: start,
    endDate: end,
    eligibleCategories: ["Wall-Hung WC"],
    targetValue: 50000,
    incentivePoints: 500,
  });
  assert.equal(scheme.status, "Draft");
  assert.equal(svc.activateScheme(scheme.id), "Active");
  throws(() => svc.updateScheme(scheme.id, { ...scheme, name: "x" }), /Only Draft or Scheduled/);
  svc.pauseScheme(scheme.id, "Budget review");
});

check("every mutation is audited", () => {
  const actions = getDb().auditLogs.map((a) => a.action);
  for (const a of ["Scan approved", "Scan rejected", "Invoice approved", "Redemption approved", "Redemption cancelled", "Scheme created", "Scheme activated", "Points credited", "Points debited"]) {
    assert.ok(actions.includes(a), `missing audit action: ${a}`);
  }
});

check("reset restores the original seed", () => {
  resetDemoDatabase();
  assert.equal(getDb().scans.find((s) => s.id === "SCN-5007")!.status, "Pending");
  assert.equal(balance("PLM-1001"), 4080);
});

console.log(`\n${passed} checks passed`);
