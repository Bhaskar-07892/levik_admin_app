"use client";

import type {
  AccountStatus,
  AuditEntityType,
  Database,
  ID,
  Invoice,
  PlumberVerificationStatus,
  PointsSource,
  PointsTransaction,
  Product,
  ProgrammeSettings,
  RedemptionStatus,
  RelatedEntityType,
  RetailerAccountStatus,
  Reward,
  Scheme,
  SupportTicket,
  TicketStatus,
  UserRole,
} from "@/types";
import type { ProductInput, RewardInput, SchemeInput, PlumberEditInput, RetailerEditInput } from "@/lib/validations";
import { commit, resetDemoDatabase } from "./store";
import {
  calculateInvoiceIncentive,
  findPlumber,
  findProduct,
  findRetailer,
  findReward,
  findUser,
  hasBlockingFailure,
  invoiceChecks,
  isSchemeLive,
  nextRedemptionStatuses,
  pointsSummary,
  redemptionChecks,
  scanChecks,
  scanPoints,
  schemeProgress,
} from "./rules";

/**
 * Central mock transaction service. Each exported function is one logical transaction: it validates,
 * updates every affected record, writes ledger and audit entries, and commits atomically.
 * Future production work: replace these bodies with API calls; keep the signatures.
 */

export class ServiceError extends Error {}

const nowIso = () => new Date().toISOString();
const actor = (db: Database) => db.settings.adminName;

function nextId(db: Database, prefix: string): string {
  const next = (db.counters[prefix] ?? 0) + 1;
  db.counters[prefix] = next;
  return `${prefix}-${next}`;
}

function audit(db: Database, action: string, entityType: AuditEntityType, entityId: ID, summary: string) {
  db.auditLogs.unshift({ id: nextId(db, "AUD"), at: nowIso(), admin: actor(db), action, entityType, entityId, summary });
}

function postPoints(
  db: Database,
  input: {
    userId: ID;
    userRole: UserRole;
    source: PointsSource;
    amount: number;
    note: string;
    related?: { type: RelatedEntityType; id: ID };
  },
): PointsTransaction {
  if (!Number.isInteger(input.amount) || input.amount === 0) throw new ServiceError("Points amount must be a non-zero whole number.");
  const txn: PointsTransaction = {
    id: nextId(db, "TXN"),
    userId: input.userId,
    userRole: input.userRole,
    source: input.source,
    related: input.related,
    credit: input.amount > 0 ? input.amount : 0,
    debit: input.amount < 0 ? -input.amount : 0,
    createdAt: nowIso(),
    status: "Posted",
    note: input.note,
    createdBy: actor(db),
  };
  db.ledger.unshift(txn);
  audit(
    db,
    input.amount > 0 ? "Points credited" : "Points debited",
    "Points",
    txn.id,
    `${Math.abs(input.amount)} pts ${input.amount > 0 ? "credited to" : "debited from"} ${input.userId} · ${input.source}`,
  );
  return txn;
}

/** Credits a one-time scheme bonus when a qualifying approval pushes a user over a live target. */
function evaluateSchemeAwards(db: Database, userId: ID, role: UserRole): Scheme[] {
  const awarded: Scheme[] = [];
  for (const scheme of db.schemes) {
    if (scheme.role !== role || !isSchemeLive(scheme) || scheme.awardedUserIds.includes(userId)) continue;
    if (schemeProgress(db, scheme, userId) < scheme.targetValue) continue;
    scheme.awardedUserIds.push(userId);
    scheme.updatedAt = nowIso();
    postPoints(db, {
      userId,
      userRole: role,
      source: "Scheme Bonus",
      amount: scheme.incentivePoints,
      note: `Target achieved: ${scheme.name}`,
      related: { type: "scheme", id: scheme.id },
    });
    audit(db, "Scheme target achieved", "Scheme", scheme.id, `${userId} earned ${scheme.incentivePoints} bonus points`);
    awarded.push(structuredClone(scheme));
  }
  return awarded;
}

function requireReason(reason: string | undefined, what = "A reason"): string {
  const trimmed = reason?.trim() ?? "";
  if (trimmed.length < 5) throw new ServiceError(`${what} of at least 5 characters is required.`);
  return trimmed;
}

// ================================================================ plumbers
export function updatePlumber(id: ID, input: PlumberEditInput) {
  return commit((db) => {
    const plumber = findPlumber(db, id);
    if (!plumber) throw new ServiceError("Plumber not found.");
    Object.assign(plumber, { ...input, email: input.email || undefined });
    audit(db, "Plumber profile edited", "Plumber", id, `Updated profile for ${plumber.name}`);
  });
}

export function setPlumberVerification(id: ID, status: PlumberVerificationStatus, note?: string) {
  return commit((db) => {
    const plumber = findPlumber(db, id);
    if (!plumber) throw new ServiceError("Plumber not found.");
    if (status === "Rejected") plumber.verificationNote = requireReason(note);
    else plumber.verificationNote = note?.trim() || undefined;
    plumber.verificationStatus = status;
    audit(db, `Plumber verification ${status.toLowerCase()}`, "Plumber", id, note?.trim() || `${plumber.name} marked ${status}`);
  });
}

export function setPlumberAccountStatus(id: ID, status: AccountStatus, reason: string) {
  return commit((db) => {
    const plumber = findPlumber(db, id);
    if (!plumber) throw new ServiceError("Plumber not found.");
    const why = requireReason(reason);
    plumber.accountStatus = status;
    audit(db, `Plumber account ${status.toLowerCase()}`, "Plumber", id, why);
  });
}

// =============================================================== retailers
export function updateRetailer(id: ID, input: RetailerEditInput) {
  return commit((db) => {
    const retailer = findRetailer(db, id);
    if (!retailer) throw new ServiceError("Retailer not found.");
    Object.assign(retailer, { ...input, gstin: input.gstin || undefined, email: input.email || undefined });
    audit(db, "Retailer details edited", "Retailer", id, `Updated shop information for ${retailer.shopName}`);
  });
}

export function reviewRetailerApplication(id: ID, decision: "Approved" | "Rejected", reason?: string) {
  return commit((db) => {
    const retailer = findRetailer(db, id);
    if (!retailer) throw new ServiceError("Retailer not found.");
    if (retailer.verificationStatus !== "Pending") throw new ServiceError("Only pending applications can be reviewed.");
    retailer.verificationStatus = decision;
    retailer.rejectionReason = decision === "Rejected" ? requireReason(reason) : undefined;
    audit(db, `Retailer ${decision.toLowerCase()}`, "Retailer", id, decision === "Rejected" ? retailer.rejectionReason! : `${retailer.shopName} approved`);
  });
}

export function setRetailerAccountStatus(id: ID, status: RetailerAccountStatus, reason: string) {
  return commit((db) => {
    const retailer = findRetailer(db, id);
    if (!retailer) throw new ServiceError("Retailer not found.");
    const why = requireReason(reason);
    retailer.accountStatus = status;
    audit(db, `Retailer account ${status.toLowerCase()}`, "Retailer", id, why);
  });
}

// ================================================================ products
export function createProduct(input: ProductInput): Product {
  return commit((db) => {
    if (db.products.some((p) => p.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new ServiceError(`SKU ${input.sku} already exists.`);
    }
    const now = nowIso();
    const product: Product = {
      id: nextId(db, "PRD"),
      ...input,
      dimensions: input.dimensions || undefined,
      features: input.features,
      image: undefined,
      createdAt: now,
      updatedAt: now,
    };
    db.products.unshift(product);
    audit(db, "Product created", "Product", product.id, `${product.name} (${product.modelCode}) added`);
    return structuredClone(product);
  });
}

export function updateProduct(id: ID, input: ProductInput) {
  return commit((db) => {
    const product = findProduct(db, id);
    if (!product) throw new ServiceError("Product not found.");
    if (db.products.some((p) => p.id !== id && p.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new ServiceError(`SKU ${input.sku} already exists.`);
    }
    Object.assign(product, input, { dimensions: input.dimensions || undefined, updatedAt: nowIso() });
    audit(db, "Product edited", "Product", id, `${product.name} updated`);
  });
}

export function setProductActive(id: ID, isActive: boolean) {
  return commit((db) => {
    const product = findProduct(db, id);
    if (!product) throw new ServiceError("Product not found.");
    product.isActive = isActive;
    product.updatedAt = nowIso();
    audit(db, isActive ? "Product activated" : "Product deactivated", "Product", id, product.name);
  });
}

// =================================================================== scans
export interface ApprovalResult {
  points: number;
  schemeAwards: Scheme[];
}

export function approveScan(id: ID, note?: string): ApprovalResult {
  return commit((db) => {
    const scan = db.scans.find((s) => s.id === id);
    if (!scan) throw new ServiceError("Scan not found.");
    if (scan.status === "Approved" || scan.ledgerTxnId) throw new ServiceError("This scan is already approved and credited.");
    if (scan.status === "Rejected") throw new ServiceError("Rejected scans cannot be approved.");
    const checks = scanChecks(db, scan);
    if (hasBlockingFailure(checks)) {
      throw new ServiceError(`Cannot approve: ${checks.filter((c) => c.blocking && !c.passed).map((c) => c.label).join(", ")}.`);
    }
    const points = scanPoints(db, scan);
    const product = findProduct(db, scan.productId)!;
    const now = nowIso();
    scan.status = "Approved";
    scan.awardedPoints = points;
    scan.reviewedBy = actor(db);
    scan.reviewedAt = now;
    scan.flagReason = undefined;
    const txn = postPoints(db, {
      userId: scan.plumberId,
      userRole: "plumber",
      source: "Product Scan",
      amount: points,
      note: `Approved scan of model ${product.modelCode}`,
      related: { type: "scan", id: scan.id },
    });
    scan.ledgerTxnId = txn.id;
    scan.history.push({ at: now, by: actor(db), action: "Approved", note: [`${points} points credited`, note?.trim()].filter(Boolean).join(" · ") });
    audit(db, "Scan approved", "Scan", scan.id, `${points} points credited to ${scan.plumberId}`);
    const schemeAwards = evaluateSchemeAwards(db, scan.plumberId, "plumber");
    return { points, schemeAwards };
  });
}

export function rejectScan(id: ID, reason: string) {
  return commit((db) => {
    const scan = db.scans.find((s) => s.id === id);
    if (!scan) throw new ServiceError("Scan not found.");
    if (scan.status === "Approved") throw new ServiceError("Approved scans cannot be rejected; use a points adjustment instead.");
    if (scan.status === "Rejected") throw new ServiceError("This scan is already rejected.");
    const why = requireReason(reason, "A rejection reason");
    scan.status = "Rejected";
    scan.rejectionReason = why;
    scan.reviewedBy = actor(db);
    scan.reviewedAt = nowIso();
    scan.history.push({ at: scan.reviewedAt, by: actor(db), action: "Rejected", note: why });
    audit(db, "Scan rejected", "Scan", scan.id, why);
  });
}

export function flagScan(id: ID, reason: string) {
  return commit((db) => {
    const scan = db.scans.find((s) => s.id === id);
    if (!scan) throw new ServiceError("Scan not found.");
    if (scan.status !== "Pending") throw new ServiceError("Only pending scans can be flagged.");
    const why = requireReason(reason);
    scan.status = "Flagged";
    scan.flagReason = why;
    scan.reviewedBy = actor(db);
    scan.reviewedAt = nowIso();
    scan.history.push({ at: scan.reviewedAt, by: actor(db), action: "Flagged for investigation", note: why });
    audit(db, "Scan flagged", "Scan", scan.id, why);
  });
}

// ================================================================ invoices
function getInvoice(db: Database, id: ID): Invoice {
  const invoice = db.invoices.find((i) => i.id === id);
  if (!invoice) throw new ServiceError("Invoice not found.");
  return invoice;
}

export function startInvoiceReview(id: ID) {
  return commit((db) => {
    const invoice = getInvoice(db, id);
    if (invoice.status !== "Submitted" && invoice.status !== "More Information Required") {
      throw new ServiceError("Only submitted invoices can be moved to review.");
    }
    invoice.status = "Under Review";
    invoice.reviewer = actor(db);
    invoice.history.push({ at: nowIso(), by: actor(db), action: "Moved to review" });
    audit(db, "Invoice review started", "Invoice", id, `${invoice.invoiceNumber} assigned to ${actor(db)}`);
  });
}

export function approveInvoice(id: ID): ApprovalResult {
  return commit((db) => {
    const invoice = getInvoice(db, id);
    if (invoice.status === "Approved" || invoice.ledgerTxnId) throw new ServiceError("This invoice is already approved and credited.");
    if (invoice.status === "Rejected") throw new ServiceError("Rejected invoices cannot be approved.");
    const checks = invoiceChecks(db, invoice);
    if (hasBlockingFailure(checks)) {
      throw new ServiceError(`Cannot approve: ${checks.filter((c) => c.blocking && !c.passed).map((c) => c.label).join(", ")}.`);
    }
    const incentive = calculateInvoiceIncentive(db, invoice);
    const now = nowIso();
    invoice.status = "Approved";
    invoice.reviewer = actor(db);
    invoice.reviewedAt = now;
    invoice.incentivePoints = incentive.points;
    invoice.infoRequest = undefined;
    if (incentive.points > 0) {
      const txn = postPoints(db, {
        userId: invoice.retailerId,
        userRole: "retailer",
        source: "Invoice Incentive",
        amount: incentive.points,
        note: `Incentive for invoice ${invoice.invoiceNumber}`,
        related: { type: "invoice", id: invoice.id },
      });
      invoice.ledgerTxnId = txn.id;
    }
    invoice.history.push({ at: now, by: actor(db), action: "Approved", note: `${incentive.points} incentive points credited` });
    audit(db, "Invoice approved", "Invoice", invoice.id, `${incentive.points} points credited to ${invoice.retailerId}`);
    const schemeAwards = evaluateSchemeAwards(db, invoice.retailerId, "retailer");
    return { points: incentive.points, schemeAwards };
  });
}

export function rejectInvoice(id: ID, reason: string) {
  return commit((db) => {
    const invoice = getInvoice(db, id);
    if (invoice.status === "Approved") throw new ServiceError("Approved invoices cannot be rejected.");
    if (invoice.status === "Rejected") throw new ServiceError("This invoice is already rejected.");
    const why = requireReason(reason, "A rejection reason");
    invoice.status = "Rejected";
    invoice.rejectionReason = why;
    invoice.reviewer = actor(db);
    invoice.reviewedAt = nowIso();
    invoice.history.push({ at: invoice.reviewedAt, by: actor(db), action: "Rejected", note: why });
    audit(db, "Invoice rejected", "Invoice", invoice.id, why);
  });
}

export function requestInvoiceInfo(id: ID, message: string) {
  return commit((db) => {
    const invoice = getInvoice(db, id);
    if (invoice.status === "Approved" || invoice.status === "Rejected") throw new ServiceError("This invoice is already closed.");
    const why = requireReason(message, "A message to the retailer");
    invoice.status = "More Information Required";
    invoice.infoRequest = why;
    invoice.reviewer = actor(db);
    invoice.reviewedAt = nowIso();
    invoice.history.push({ at: invoice.reviewedAt, by: actor(db), action: "More information requested", note: why });
    audit(db, "Invoice info requested", "Invoice", invoice.id, why);
  });
}

// ================================================================= rewards
export function createReward(input: RewardInput): Reward {
  return commit((db) => {
    const now = nowIso();
    const reward: Reward = { id: nextId(db, "RWD"), ...input, createdAt: now, updatedAt: now };
    db.rewards.unshift(reward);
    audit(db, "Reward created", "Reward", reward.id, `${reward.name} · ${reward.pointsRequired} pts`);
    return structuredClone(reward);
  });
}

export function updateReward(id: ID, input: RewardInput) {
  return commit((db) => {
    const reward = findReward(db, id);
    if (!reward) throw new ServiceError("Reward not found.");
    Object.assign(reward, input, { updatedAt: nowIso() });
    audit(db, "Reward edited", "Reward", id, reward.name);
  });
}

export function setRewardActive(id: ID, isActive: boolean) {
  return commit((db) => {
    const reward = findReward(db, id);
    if (!reward) throw new ServiceError("Reward not found.");
    reward.isActive = isActive;
    reward.updatedAt = nowIso();
    audit(db, isActive ? "Reward activated" : "Reward deactivated", "Reward", id, reward.name);
  });
}

export function adjustRewardStock(id: ID, delta: number, reason: string) {
  return commit((db) => {
    const reward = findReward(db, id);
    if (!reward) throw new ServiceError("Reward not found.");
    if (!Number.isInteger(delta) || delta === 0) throw new ServiceError("Enter a non-zero whole number.");
    if (reward.stock + delta < 0) throw new ServiceError(`Stock cannot go below zero (current stock ${reward.stock}).`);
    const why = requireReason(reason);
    reward.stock += delta;
    reward.updatedAt = nowIso();
    audit(db, "Reward stock adjusted", "Reward", id, `${delta > 0 ? "+" : ""}${delta} units (now ${reward.stock}) · ${why}`);
  });
}

// ============================================================= redemptions
export function approveRedemption(id: ID) {
  return commit((db) => {
    const redemption = db.redemptions.find((r) => r.id === id);
    if (!redemption) throw new ServiceError("Redemption not found.");
    if (redemption.status !== "Requested") throw new ServiceError("Only requested redemptions can be approved.");
    if (redemption.debitTxnId) throw new ServiceError("Points have already been deducted for this redemption.");
    const checks = redemptionChecks(db, redemption);
    if (hasBlockingFailure(checks)) {
      throw new ServiceError(`Cannot approve: ${checks.filter((c) => c.blocking && !c.passed).map((c) => c.label).join(", ")}.`);
    }
    const reward = findReward(db, redemption.rewardId)!;
    reward.stock -= 1;
    reward.updatedAt = nowIso();
    const txn = postPoints(db, {
      userId: redemption.userId,
      userRole: redemption.userRole,
      source: "Redemption",
      amount: -redemption.pointsCost,
      note: `Redeemed: ${reward.name}`,
      related: { type: "redemption", id: redemption.id },
    });
    redemption.debitTxnId = txn.id;
    redemption.status = "Approved";
    redemption.history.push({ at: nowIso(), by: actor(db), action: "Approved", note: `${redemption.pointsCost} points deducted · stock now ${reward.stock}` });
    audit(db, "Redemption approved", "Redemption", id, `${redemption.pointsCost} pts deducted from ${redemption.userId}; ${reward.name} stock now ${reward.stock}`);
  });
}

/** Moves a redemption along the fulfilment workflow. Never deducts points; refunds once on cancel/fail. */
export function updateRedemptionStatus(id: ID, next: RedemptionStatus, reason?: string) {
  if (next === "Approved") return approveRedemption(id);
  return commit((db) => {
    const redemption = db.redemptions.find((r) => r.id === id);
    if (!redemption) throw new ServiceError("Redemption not found.");
    const reward = findReward(db, redemption.rewardId);
    if (!nextRedemptionStatuses(redemption, reward).includes(next)) {
      throw new ServiceError(`Cannot move a ${redemption.status} redemption to ${next}.`);
    }
    const now = nowIso();
    let note: string | undefined;
    if (next === "Processing") {
      redemption.fulfilmentRef = `FUL-${redemption.id.slice(4)}-${now.slice(5, 10).replace("-", "")}`;
      note = `Fulfilment reference ${redemption.fulfilmentRef}`;
    }
    if (next === "Dispatched") {
      redemption.courierName = "Levik Demo Logistics";
      redemption.trackingNumber = `LDL${redemption.id.slice(4)}${now.slice(11, 16).replace(":", "")}`;
      note = `Mock tracking ${redemption.trackingNumber}`;
    }
    if (next === "Delivered" && reward?.type === "Digital" && !redemption.voucherCode) {
      redemption.voucherCode = `DEMO-${redemption.id.slice(4)}-${now.slice(14, 16)}${now.slice(17, 19)}`;
      note = `Mock voucher code ${redemption.voucherCode} sent`;
    }
    if (next === "Cancelled" || next === "Failed") {
      const why = requireReason(reason);
      redemption.cancelReason = why;
      note = why;
      if (redemption.debitTxnId && !redemption.reversalTxnId) {
        const reversal = postPoints(db, {
          userId: redemption.userId,
          userRole: redemption.userRole,
          source: "Redemption Reversal",
          amount: redemption.pointsCost,
          note: `Refund for ${next.toLowerCase()} redemption ${redemption.id}`,
          related: { type: "redemption", id: redemption.id },
        });
        redemption.reversalTxnId = reversal.id;
        if (reward) {
          reward.stock += 1;
          reward.updatedAt = now;
        }
        note = `${why} · ${redemption.pointsCost} points refunded, stock restored`;
      }
    }
    redemption.status = next;
    redemption.history.push({ at: now, by: actor(db), action: next, note });
    audit(db, `Redemption ${next.toLowerCase()}`, "Redemption", id, note ?? `${redemption.id} moved to ${next}`);
  });
}

// ================================================================= schemes
function validateSchemeDates(input: SchemeInput) {
  if (input.endDate < input.startDate) throw new ServiceError("End date must be on or after the start date.");
}

export function createScheme(input: SchemeInput): Scheme {
  validateSchemeDates(input);
  return commit((db) => {
    const now = nowIso();
    const scheme: Scheme = {
      id: nextId(db, "SCH"),
      ...input,
      targetType: input.role === "retailer" ? "Sales Amount" : "Approved Scans",
      status: "Draft",
      awardedUserIds: [],
      createdAt: now,
      updatedAt: now,
    };
    db.schemes.unshift(scheme);
    audit(db, "Scheme created", "Scheme", scheme.id, `${scheme.name} saved as Draft`);
    return structuredClone(scheme);
  });
}

export function updateScheme(id: ID, input: SchemeInput) {
  validateSchemeDates(input);
  return commit((db) => {
    const scheme = db.schemes.find((s) => s.id === id);
    if (!scheme) throw new ServiceError("Scheme not found.");
    if (scheme.status !== "Draft" && scheme.status !== "Scheduled") {
      throw new ServiceError("Only Draft or Scheduled schemes can be edited.");
    }
    Object.assign(scheme, input, {
      targetType: input.role === "retailer" ? "Sales Amount" : "Approved Scans",
      updatedAt: nowIso(),
    });
    audit(db, "Scheme edited", "Scheme", id, scheme.name);
  });
}

export function activateScheme(id: ID): Scheme["status"] {
  return commit((db) => {
    const scheme = db.schemes.find((s) => s.id === id);
    if (!scheme) throw new ServiceError("Scheme not found.");
    if (!["Draft", "Scheduled", "Paused"].includes(scheme.status)) throw new ServiceError(`A ${scheme.status} scheme cannot be activated.`);
    const now = nowIso();
    if (scheme.endDate < now) throw new ServiceError("The scheme end date has passed. Edit the dates before activating.");
    scheme.status = scheme.startDate > now ? "Scheduled" : "Active";
    scheme.updatedAt = now;
    audit(db, scheme.status === "Active" ? "Scheme activated" : "Scheme scheduled", "Scheme", id, `${scheme.name} is now ${scheme.status}`);
    return scheme.status;
  });
}

export function pauseScheme(id: ID, reason: string) {
  return commit((db) => {
    const scheme = db.schemes.find((s) => s.id === id);
    if (!scheme) throw new ServiceError("Scheme not found.");
    if (scheme.status !== "Active" && scheme.status !== "Scheduled") throw new ServiceError("Only active or scheduled schemes can be paused.");
    const why = requireReason(reason);
    scheme.status = "Paused";
    scheme.updatedAt = nowIso();
    audit(db, "Scheme paused", "Scheme", id, why);
  });
}

export function completeScheme(id: ID) {
  return commit((db) => {
    const scheme = db.schemes.find((s) => s.id === id);
    if (!scheme) throw new ServiceError("Scheme not found.");
    if (scheme.status !== "Active" && scheme.status !== "Paused") throw new ServiceError("Only active or paused schemes can be completed.");
    scheme.status = "Completed";
    scheme.updatedAt = nowIso();
    audit(db, "Scheme completed", "Scheme", id, `${scheme.name} closed with ${scheme.awardedUserIds.length} achievers`);
  });
}

// =============================================================== inventory
export function updateInventory(id: ID, quantity: number, note?: string) {
  return commit((db) => {
    const item = db.inventory.find((i) => i.id === id);
    if (!item) throw new ServiceError("Inventory record not found.");
    if (!Number.isInteger(quantity) || quantity < 0) throw new ServiceError("Quantity must be a whole number of zero or more.");
    const before = item.quantity;
    item.quantity = quantity;
    item.updatedAt = nowIso();
    item.updatedBy = actor(db);
    audit(db, "Inventory updated", "Inventory", id, `${before} → ${quantity} units${note?.trim() ? ` · ${note.trim()}` : ""}`);
  });
}

// ================================================================== points
export function adjustPoints(userId: ID, amount: number, reason: string) {
  return commit((db) => {
    const user = findUser(db, userId);
    if (!user) throw new ServiceError("User not found.");
    const why = requireReason(reason);
    if (amount < 0 && pointsSummary(db, userId).available + amount < 0) {
      throw new ServiceError("A debit adjustment cannot make the balance negative.");
    }
    postPoints(db, { userId, userRole: user.role, source: "Manual Adjustment", amount, note: why });
  });
}

// ================================================================= support
export function updateTicket(id: ID, status: TicketStatus, note?: string): SupportTicket {
  return commit((db) => {
    const ticket = db.tickets.find((t) => t.id === id);
    if (!ticket) throw new ServiceError("Ticket not found.");
    const now = nowIso();
    if (note?.trim()) ticket.notes.push({ at: now, by: actor(db), text: note.trim() });
    const changed = ticket.status !== status;
    ticket.status = status;
    ticket.updatedAt = now;
    audit(db, changed ? `Ticket ${status.toLowerCase()}` : "Ticket note added", "Support", id, note?.trim() || `${ticket.subject} → ${status}`);
    return structuredClone(ticket);
  });
}

// ================================================================ settings
export function updateSettings(patch: Partial<ProgrammeSettings>) {
  return commit((db) => {
    db.settings = { ...db.settings, ...patch, notifications: { ...db.settings.notifications, ...patch.notifications } };
    audit(db, "Settings updated", "Settings", "SETTINGS", Object.keys(patch).join(", "));
  });
}

export function recordSessionEvent(action: "Admin signed in" | "Admin signed out") {
  return commit((db) => audit(db, action, "Session", "SESSION", `${db.settings.adminEmail} (demo authentication)`));
}

export function resetDemoData() {
  resetDemoDatabase();
}

