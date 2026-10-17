import type {
  Database,
  ID,
  Invoice,
  Plumber,
  Product,
  ProductScan,
  Redemption,
  Retailer,
  Reward,
  Scheme,
  StockStatus,
  UserRole,
} from "@/types";

/**
 * Pure, deterministic business rules for the demo. Pages and services both use these so the
 * numbers a reviewer sees before approving are exactly what the transaction service applies.
 */

export const GST_RATE = 0.18;
export const SALES_WINDOW_DAYS = 30;

// ------------------------------------------------------------------ lookups
export const findPlumber = (db: Database, id?: ID) => db.plumbers.find((p) => p.id === id);
export const findRetailer = (db: Database, id?: ID) => db.retailers.find((r) => r.id === id);
export const findProduct = (db: Database, id?: ID) => db.products.find((p) => p.id === id);
export const findReward = (db: Database, id?: ID) => db.rewards.find((r) => r.id === id);
export const findScheme = (db: Database, id?: ID) => db.schemes.find((s) => s.id === id);

export interface UserSummary {
  id: ID;
  role: UserRole;
  name: string;
  subtitle: string;
  href: string;
}

export function findUser(db: Database, id: ID): UserSummary | undefined {
  const plumber = findPlumber(db, id);
  if (plumber) {
    return { id, role: "plumber", name: plumber.name, subtitle: `${plumber.city}, ${plumber.state}`, href: `/plumbers/${id}` };
  }
  const retailer = findRetailer(db, id);
  if (retailer) {
    return { id, role: "retailer", name: retailer.shopName, subtitle: retailer.ownerName, href: `/retailers/${id}` };
  }
  return undefined;
}

// ------------------------------------------------------------------- points
export interface PointsSummary {
  lifetime: number;
  redeemed: number;
  available: number;
}

/** Every balance in the app is derived from ledger entries through this function. */
export function pointsSummary(db: Database, userId: ID): PointsSummary {
  let credits = 0;
  let debits = 0;
  let redeemed = 0;
  let reversals = 0;
  for (const txn of db.ledger) {
    if (txn.userId !== userId) continue;
    credits += txn.credit;
    debits += txn.debit;
    if (txn.source === "Redemption") redeemed += txn.debit;
    if (txn.source === "Redemption Reversal") reversals += txn.credit;
  }
  return { lifetime: credits - reversals, redeemed: redeemed - reversals, available: credits - debits };
}

export function balanceMap(db: Database): Map<ID, PointsSummary> {
  const map = new Map<ID, PointsSummary>();
  for (const id of [...db.plumbers.map((p) => p.id), ...db.retailers.map((r) => r.id)]) {
    map.set(id, pointsSummary(db, id));
  }
  return map;
}

// ----------------------------------------------------------------- invoices
export function invoiceSubtotal(invoice: Invoice): number {
  return invoice.lineItems.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

export function invoiceTotals(invoice: Invoice) {
  const subtotal = invoiceSubtotal(invoice);
  const gst = Math.round(subtotal * GST_RATE);
  return { subtotal, gst, total: subtotal + gst };
}

export interface InvoiceIncentiveLine {
  lineId: ID;
  product?: Product;
  quantity: number;
  unitPrice: number;
  value: number;
  eligible: boolean;
  reason?: string;
  points: number;
}

export interface InvoiceIncentive {
  rate: number;
  lines: InvoiceIncentiveLine[];
  eligibleValue: number;
  points: number;
}

/** Sample rule: N points per ₹100 of pre-GST value on active, reward-eligible products. */
export function calculateInvoiceIncentive(db: Database, invoice: Invoice): InvoiceIncentive {
  const rate = db.settings.retailerPointsPer100;
  const lines = invoice.lineItems.map<InvoiceIncentiveLine>((line) => {
    const product = findProduct(db, line.productId);
    const value = line.quantity * line.unitPrice;
    let reason: string | undefined;
    if (!product) reason = "Unknown product";
    else if (!product.rewardEligible) reason = "Not reward-eligible";
    else if (!product.isActive) reason = "Product inactive";
    const eligible = !reason;
    return {
      lineId: line.id,
      product,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      value,
      eligible,
      reason,
      points: eligible ? Math.floor((value / 100) * rate) : 0,
    };
  });
  const eligibleValue = lines.filter((l) => l.eligible).reduce((sum, l) => sum + l.value, 0);
  return { rate, lines, eligibleValue, points: Math.floor((eligibleValue / 100) * rate) };
}

export interface Check {
  label: string;
  passed: boolean;
  blocking: boolean;
  detail: string;
}

export function invoiceChecks(db: Database, invoice: Invoice): Check[] {
  const retailer = findRetailer(db, invoice.retailerId);
  const duplicate = db.invoices.find(
    (other) =>
      other.id !== invoice.id &&
      other.retailerId === invoice.retailerId &&
      other.invoiceNumber === invoice.invoiceNumber &&
      other.status !== "Rejected",
  );
  const incentive = calculateInvoiceIncentive(db, invoice);
  return [
    {
      label: "Retailer approved",
      passed: retailer?.verificationStatus === "Approved",
      blocking: true,
      detail: retailer ? `Application status: ${retailer.verificationStatus}` : "Retailer not found",
    },
    {
      label: "Retailer account active",
      passed: retailer?.accountStatus === "Active",
      blocking: true,
      detail: retailer ? `Account status: ${retailer.accountStatus}` : "Retailer not found",
    },
    {
      label: "Invoice number is unique",
      passed: !duplicate,
      blocking: true,
      detail: duplicate
        ? `Same number already used on ${duplicate.id} (${duplicate.status})`
        : "No other active invoice uses this number",
    },
    {
      label: "Contains eligible products",
      passed: incentive.eligibleValue > 0,
      blocking: false,
      detail: `${incentive.lines.filter((l) => l.eligible).length} of ${incentive.lines.length} lines earn incentive`,
    },
  ];
}

// -------------------------------------------------------------------- scans
export function scanChecks(db: Database, scan: ProductScan): Check[] {
  const product = findProduct(db, scan.productId);
  const plumber = findPlumber(db, scan.plumberId);
  const retailer = findRetailer(db, scan.retailerId);
  const duplicate = db.scans.find(
    (other) => other.id !== scan.id && other.submittedCode === scan.submittedCode && other.status === "Approved",
  );
  const linkedInvoice = scan.invoiceNumber
    ? db.invoices.find((inv) => inv.invoiceNumber === scan.invoiceNumber && inv.retailerId === scan.retailerId)
    : undefined;
  const invoiceHasProduct = linkedInvoice?.lineItems.some((line) => line.productId === scan.productId);

  return [
    {
      label: "Product code recognised",
      passed: Boolean(product?.isActive),
      blocking: true,
      detail: product ? `${product.name} (${product.isActive ? "active" : "inactive"})` : "Code does not match the catalogue",
    },
    {
      label: "Product is reward-eligible",
      passed: Boolean(product?.rewardEligible),
      blocking: true,
      detail: product?.rewardEligible ? `${product.plumberPoints} points per approved scan` : "Product does not earn scan points",
    },
    {
      label: "Plumber KYC verified",
      passed: plumber?.verificationStatus === "Verified",
      blocking: true,
      detail: plumber ? `KYC status: ${plumber.verificationStatus}` : "Plumber not found",
    },
    {
      label: "Plumber account active",
      passed: plumber?.accountStatus === "Active",
      blocking: true,
      detail: plumber ? `Account status: ${plumber.accountStatus}` : "Plumber not found",
    },
    {
      label: "Proof of sale from an approved retailer",
      passed: retailer?.verificationStatus === "Approved",
      blocking: true,
      detail: retailer
        ? `${retailer.shopName}${scan.invoiceNumber ? ` · invoice ${scan.invoiceNumber}` : ""}`
        : "No retailer or invoice reference supplied",
    },
    {
      label: "Serial code not previously credited",
      passed: !duplicate,
      blocking: true,
      detail: duplicate ? `Already credited on ${duplicate.id}` : "No approved scan uses this serial",
    },
    {
      label: "Linked invoice lists this product",
      passed: !scan.invoiceNumber || Boolean(invoiceHasProduct),
      blocking: false,
      detail: !scan.invoiceNumber
        ? "No invoice number supplied (retailer reference only)"
        : linkedInvoice
          ? invoiceHasProduct
            ? `${linkedInvoice.id} includes this model`
            : `${linkedInvoice.id} does not include this model`
          : "Invoice number not found in submitted invoices",
    },
  ];
}

export const hasBlockingFailure = (checks: Check[]) => checks.some((c) => c.blocking && !c.passed);

export function scanPoints(db: Database, scan: ProductScan): number {
  const product = findProduct(db, scan.productId);
  return product && product.rewardEligible ? product.plumberPoints : 0;
}

// ------------------------------------------------------------------ schemes
export function isWithin(iso: string, start: string, end: string) {
  return iso >= start && iso <= end;
}

export function isSchemeLive(scheme: Scheme, nowIso = new Date().toISOString()) {
  return scheme.status === "Active" && isWithin(nowIso, scheme.startDate, scheme.endDate);
}

/** Progress for one participant: INR value for retailer schemes, scan count for plumber campaigns. */
export function schemeProgress(db: Database, scheme: Scheme, userId: ID): number {
  if (scheme.targetType === "Sales Amount") {
    let total = 0;
    for (const invoice of db.invoices) {
      if (invoice.retailerId !== userId || invoice.status !== "Approved") continue;
      if (!isWithin(invoice.invoiceDate, scheme.startDate, scheme.endDate)) continue;
      for (const line of invoice.lineItems) {
        const product = findProduct(db, line.productId);
        if (product && scheme.eligibleCategories.includes(product.category)) total += line.quantity * line.unitPrice;
      }
    }
    return total;
  }
  return db.scans.filter((scan) => {
    if (scan.plumberId !== userId || scan.status !== "Approved") return false;
    if (!isWithin(scan.scannedAt, scheme.startDate, scheme.endDate)) return false;
    const product = findProduct(db, scan.productId);
    return Boolean(product && scheme.eligibleCategories.includes(product.category));
  }).length;
}

export interface SchemeParticipant {
  userId: ID;
  name: string;
  location: string;
  progress: number;
  percent: number;
  awarded: boolean;
}

export function schemeParticipants(db: Database, scheme: Scheme): SchemeParticipant[] {
  const users: Array<Plumber | Retailer> =
    scheme.role === "plumber"
      ? db.plumbers.filter((p) => p.verificationStatus === "Verified" && p.accountStatus === "Active")
      : db.retailers.filter((r) => r.verificationStatus === "Approved" && r.accountStatus === "Active");
  return users
    .map((user) => {
      const progress = schemeProgress(db, scheme, user.id);
      return {
        userId: user.id,
        name: "shopName" in user ? user.shopName : user.name,
        location: `${user.city}, ${user.state}`,
        progress,
        percent: Math.min(100, Math.round((progress / scheme.targetValue) * 100)),
        awarded: scheme.awardedUserIds.includes(user.id),
      };
    })
    .sort((a, b) => b.progress - a.progress);
}

export interface SchemeImpact {
  scheme: Scheme;
  before: number;
  after: number;
  willAward: boolean;
  alreadyAwarded: boolean;
}

/** Shows how approving a scan or invoice would move the user's live scheme progress. */
export function schemeImpactsFor(
  db: Database,
  userId: ID,
  role: UserRole,
  delta: (scheme: Scheme) => number,
): SchemeImpact[] {
  return db.schemes
    .filter((scheme) => scheme.role === role && isSchemeLive(scheme))
    .map((scheme) => {
      const before = schemeProgress(db, scheme, userId);
      const after = before + delta(scheme);
      const alreadyAwarded = scheme.awardedUserIds.includes(userId);
      return { scheme, before, after, alreadyAwarded, willAward: !alreadyAwarded && after >= scheme.targetValue };
    })
    .filter((impact) => impact.after !== impact.before || impact.alreadyAwarded);
}

export function scanSchemeImpacts(db: Database, scan: ProductScan): SchemeImpact[] {
  const product = findProduct(db, scan.productId);
  return schemeImpactsFor(db, scan.plumberId, "plumber", (scheme) =>
    product && scheme.eligibleCategories.includes(product.category) && isWithin(scan.scannedAt, scheme.startDate, scheme.endDate)
      ? 1
      : 0,
  );
}

export function invoiceSchemeImpacts(db: Database, invoice: Invoice): SchemeImpact[] {
  return schemeImpactsFor(db, invoice.retailerId, "retailer", (scheme) => {
    if (!isWithin(invoice.invoiceDate, scheme.startDate, scheme.endDate)) return 0;
    return invoice.lineItems.reduce((sum, line) => {
      const product = findProduct(db, line.productId);
      return product && scheme.eligibleCategories.includes(product.category) ? sum + line.quantity * line.unitPrice : sum;
    }, 0);
  });
}

// ---------------------------------------------------------------- retailers
export function retailerSales(db: Database, retailerId: ID, days = SALES_WINDOW_DAYS): number {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return db.invoices
    .filter((inv) => inv.retailerId === retailerId && inv.status === "Approved" && inv.invoiceDate >= since)
    .reduce((sum, inv) => sum + invoiceSubtotal(inv), 0);
}

export function retailerAchievement(db: Database, retailer: Retailer): number {
  if (!retailer.monthlyTarget) return 0;
  return Math.round((retailerSales(db, retailer.id) / retailer.monthlyTarget) * 100);
}

// -------------------------------------------------------------- redemptions
export function redemptionChecks(db: Database, redemption: Redemption): Check[] {
  const reward = findReward(db, redemption.rewardId);
  const user = findUser(db, redemption.userId);
  const balance = pointsSummary(db, redemption.userId).available;
  const accountActive =
    redemption.userRole === "plumber"
      ? findPlumber(db, redemption.userId)?.accountStatus === "Active"
      : findRetailer(db, redemption.userId)?.accountStatus === "Active";
  return [
    {
      label: "Sufficient points balance",
      passed: balance >= redemption.pointsCost,
      blocking: true,
      detail: `Available ${balance.toLocaleString("en-IN")} pts · required ${redemption.pointsCost.toLocaleString("en-IN")} pts`,
    },
    {
      label: "Reward in stock",
      passed: Boolean(reward && reward.stock > 0),
      blocking: true,
      detail: reward ? `${reward.stock} units available` : "Reward not found",
    },
    {
      label: "Reward active",
      passed: Boolean(reward?.isActive),
      blocking: true,
      detail: reward?.isActive ? "Reward is active in the catalogue" : "Reward is deactivated",
    },
    {
      label: "Account in good standing",
      passed: Boolean(user && accountActive),
      blocking: true,
      detail: user ? `${user.name}` : "User not found",
    },
  ];
}

/** Allowed next statuses for the fulfilment workflow. */
export function nextRedemptionStatuses(redemption: Redemption, reward?: Reward): Redemption["status"][] {
  switch (redemption.status) {
    case "Requested":
      return ["Approved", "Cancelled"];
    case "Approved":
      return ["Processing", "Cancelled"];
    case "Processing":
      return reward?.type === "Physical" ? ["Dispatched", "Failed", "Cancelled"] : ["Delivered", "Failed", "Cancelled"];
    case "Dispatched":
      return ["Delivered"];
    default:
      return [];
  }
}

// ---------------------------------------------------------------- inventory
export function stockStatus(quantity: number, threshold: number): StockStatus {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= threshold) return "Low Stock";
  return "In Stock";
}
