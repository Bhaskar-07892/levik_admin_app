import type { Database, ID, PointsSource, ScanStatus } from "@/types";
import {
  balanceMap,
  findPlumber,
  findProduct,
  findRetailer,
  invoiceSubtotal,
  isSchemeLive,
  retailerAchievement,
  retailerSales,
  stockStatus,
} from "./rules";

/**
 * Read-side service functions. They are pure functions of the database snapshot so that every
 * page, chart and KPI is derived from the same records.
 */

export const listPlumbers = (db: Database) => {
  const balances = balanceMap(db);
  return db.plumbers.map((plumber) => ({ ...plumber, points: balances.get(plumber.id)! }));
};
export type PlumberRow = ReturnType<typeof listPlumbers>[number];

export const getPlumberById = (db: Database, id: ID) => findPlumber(db, id);

export const listRetailers = (db: Database) => {
  const balances = balanceMap(db);
  return db.retailers.map((retailer) => ({
    ...retailer,
    points: balances.get(retailer.id)!,
    sales30d: retailerSales(db, retailer.id),
    achievement: retailerAchievement(db, retailer),
  }));
};
export type RetailerRow = ReturnType<typeof listRetailers>[number];

export const getRetailerById = (db: Database, id: ID) => findRetailer(db, id);

export const listProducts = (db: Database) => db.products;

export const listScans = (db: Database) =>
  db.scans
    .map((scan) => ({
      ...scan,
      plumber: findPlumber(db, scan.plumberId),
      product: findProduct(db, scan.productId),
      retailer: findRetailer(db, scan.retailerId),
      expectedPoints: findProduct(db, scan.productId)?.rewardEligible ? findProduct(db, scan.productId)!.plumberPoints : 0,
    }))
    .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
export type ScanRow = ReturnType<typeof listScans>[number];

export const listInvoices = (db: Database) =>
  db.invoices
    .map((invoice) => ({ ...invoice, retailer: findRetailer(db, invoice.retailerId), amount: invoiceSubtotal(invoice) }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
export type InvoiceRow = ReturnType<typeof listInvoices>[number];

export const listRewards = (db: Database) =>
  db.rewards.map((reward) => ({
    ...reward,
    redemptionCount: db.redemptions.filter((r) => r.rewardId === reward.id && r.debitTxnId && !r.reversalTxnId).length,
  }));
export type RewardRow = ReturnType<typeof listRewards>[number];

export const listRedemptions = (db: Database) =>
  db.redemptions
    .map((redemption) => {
      const userName =
        redemption.userRole === "plumber"
          ? findPlumber(db, redemption.userId)?.name
          : findRetailer(db, redemption.userId)?.shopName;
      return { ...redemption, userName: userName ?? redemption.userId, reward: db.rewards.find((r) => r.id === redemption.rewardId) };
    })
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
export type RedemptionRow = ReturnType<typeof listRedemptions>[number];

export const listSchemes = (db: Database) => db.schemes;

export const listPointsTransactions = (db: Database) =>
  db.ledger
    .map((txn) => {
      const userName = txn.userRole === "plumber" ? findPlumber(db, txn.userId)?.name : findRetailer(db, txn.userId)?.shopName;
      return { ...txn, userName: userName ?? txn.userId };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export type LedgerRow = ReturnType<typeof listPointsTransactions>[number];

export const listInventory = (db: Database) =>
  db.inventory.map((item) => ({
    ...item,
    product: findProduct(db, item.productId),
    retailer: findRetailer(db, item.retailerId),
    stockStatus: stockStatus(item.quantity, db.settings.lowStockThreshold),
  }));
export type InventoryRow = ReturnType<typeof listInventory>[number];

export const listAuditLogs = (db: Database) => [...db.auditLogs].sort((a, b) => b.at.localeCompare(a.at));

// =============================================================== analytics
export type Period = "7d" | "30d" | "90d" | "all";
export const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export function periodStart(period: Period, db: Database): Date {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 0;
  if (days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d;
  }
  const earliest = [...db.ledger.map((t) => t.createdAt), ...db.invoices.map((i) => i.invoiceDate), ...db.scans.map((s) => s.scannedAt)]
    .sort()[0];
  const d = new Date(earliest ?? Date.now());
  d.setHours(0, 0, 0, 0);
  return d;
}

interface Bucket {
  key: string;
  label: string;
  start: number;
  end: number;
}

function buckets(period: Period, db: Database): Bucket[] {
  const start = periodStart(period, db);
  const end = Date.now();
  const result: Bucket[] = [];
  const fmtDay = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });
  const fmtMonth = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" });
  if (period === "7d" || period === "30d") {
    for (let d = new Date(start); d.getTime() <= end; d.setDate(d.getDate() + 1)) {
      const s = d.getTime();
      result.push({ key: String(s), label: fmtDay.format(d), start: s, end: s + 86400000 });
    }
  } else if (period === "90d") {
    for (let d = new Date(start); d.getTime() <= end; d.setDate(d.getDate() + 7)) {
      const s = d.getTime();
      result.push({ key: String(s), label: `Wk of ${fmtDay.format(d)}`, start: s, end: s + 7 * 86400000 });
    }
  } else {
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d.getTime() <= end) {
      const s = d.getTime();
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      result.push({ key: String(s), label: fmtMonth.format(d), start: s, end: next.getTime() });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return result;
}

const inRange = (iso: string, start: Date) => new Date(iso).getTime() >= start.getTime();
const ISSUED_SOURCES: PointsSource[] = ["Product Scan", "Invoice Incentive", "Scheme Bonus", "Manual Adjustment"];

export function getDashboardMetrics(db: Database, period: Period) {
  const start = periodStart(period, db);
  const periodScans = db.scans.filter((s) => inRange(s.scannedAt, start));
  const periodLedger = db.ledger.filter((t) => inRange(t.createdAt, start));
  const approvedInvoices = db.invoices.filter((i) => i.status === "Approved" && inRange(i.invoiceDate, start));

  const pointsIssued = periodLedger.filter((t) => ISSUED_SOURCES.includes(t.source)).reduce((s, t) => s + t.credit, 0);
  const pointsRedeemed =
    periodLedger.filter((t) => t.source === "Redemption").reduce((s, t) => s + t.debit, 0) -
    periodLedger.filter((t) => t.source === "Redemption Reversal").reduce((s, t) => s + t.credit, 0);

  const kpis = {
    totalPlumbers: db.plumbers.length,
    verifiedPlumbers: db.plumbers.filter((p) => p.verificationStatus === "Verified").length,
    activeRetailers: db.retailers.filter((r) => r.verificationStatus === "Approved" && r.accountStatus === "Active").length,
    productScans: periodScans.length,
    pendingScans: db.scans.filter((s) => s.status === "Pending").length,
    pendingInvoices: db.invoices.filter((i) => ["Submitted", "Under Review"].includes(i.status)).length,
    activeSchemes: db.schemes.filter((s) => isSchemeLive(s)).length,
    pointsIssued,
    pointsRedeemed,
    pendingRedemptions: db.redemptions.filter((r) => r.status === "Requested").length,
    verifiedSales: approvedInvoices.reduce((s, i) => s + invoiceSubtotal(i), 0),
  };

  const bucketList = buckets(period, db);
  const pick = (iso: string) => {
    const t = new Date(iso).getTime();
    return bucketList.find((b) => t >= b.start && t < b.end);
  };

  const salesTrend = bucketList.map((b) => ({ label: b.label, sales: 0, invoices: 0 }));
  for (const invoice of approvedInvoices) {
    const b = pick(invoice.invoiceDate);
    if (!b) continue;
    const row = salesTrend[bucketList.indexOf(b)];
    row.sales += invoiceSubtotal(invoice);
    row.invoices += 1;
  }

  const scanTrend = bucketList.map((b) => ({ label: b.label, Approved: 0, Pending: 0, Rejected: 0, Flagged: 0 }));
  for (const scan of periodScans) {
    const b = pick(scan.scannedAt);
    if (b) scanTrend[bucketList.indexOf(b)][scan.status] += 1;
  }

  const pointsTrend = bucketList.map((b) => ({ label: b.label, earned: 0, redeemed: 0 }));
  for (const txn of periodLedger) {
    const b = pick(txn.createdAt);
    if (!b) continue;
    const row = pointsTrend[bucketList.indexOf(b)];
    if (ISSUED_SOURCES.includes(txn.source)) row.earned += txn.credit;
    if (txn.source === "Redemption") row.redeemed += txn.debit;
    if (txn.source === "Redemption Reversal") row.redeemed -= txn.credit;
  }

  return { kpis, salesTrend, scanTrend, pointsTrend, start };
}

export function scansByStatus(db: Database, start: Date) {
  const counts: Record<ScanStatus, number> = { Pending: 0, Approved: 0, Rejected: 0, Flagged: 0 };
  for (const scan of db.scans) if (inRange(scan.scannedAt, start)) counts[scan.status] += 1;
  return (Object.keys(counts) as ScanStatus[]).map((status) => ({ status, count: counts[status] }));
}

export function topRetailers(db: Database, start: Date) {
  return db.retailers
    .map((retailer) => {
      const invoices = db.invoices.filter((i) => i.retailerId === retailer.id && i.status === "Approved" && inRange(i.invoiceDate, start));
      return {
        id: retailer.id,
        name: retailer.shopName,
        city: retailer.city,
        invoices: invoices.length,
        sales: invoices.reduce((s, i) => s + invoiceSubtotal(i), 0),
        points: invoices.reduce((s, i) => s + (i.incentivePoints ?? 0), 0),
      };
    })
    .filter((r) => r.sales > 0)
    .sort((a, b) => b.sales - a.sales);
}

export function topScannedProducts(db: Database, start: Date) {
  return db.products
    .map((product) => {
      const scans = db.scans.filter((s) => s.productId === product.id && inRange(s.scannedAt, start));
      const approved = scans.filter((s) => s.status === "Approved");
      return {
        id: product.id,
        name: product.name,
        modelCode: product.modelCode,
        category: product.category,
        scans: scans.length,
        approved: approved.length,
        points: approved.reduce((s, scan) => s + (scan.awardedPoints ?? 0), 0),
      };
    })
    .filter((p) => p.scans > 0)
    .sort((a, b) => b.scans - a.scans || b.approved - a.approved);
}
