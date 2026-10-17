import type {
  AuditEntityType,
  AuditLog,
  Database,
  ID,
  InventoryItem,
  Invoice,
  InvoiceLineItem,
  Plumber,
  PointsSource,
  PointsTransaction,
  Product,
  ProductScan,
  Redemption,
  RedemptionStatus,
  RelatedEntityType,
  Retailer,
  Reward,
  Scheme,
  StatusEvent,
  SupportTicket,
  UserRole,
} from "@/types";
import { buildProducts } from "./products";

/** Bump when the seed shape changes so stale browser data is replaced. */
export const DEMO_DATA_VERSION = 4;

export const DEMO_ADMIN = {
  id: "ADM-1",
  name: "Neha Kapoor",
  email: "admin@levik.demo",
  role: "Programme Administrator" as const,
};

const SENIOR_REVIEWER = "Arvind Menon";
const SYSTEM = "System";

/**
 * Builds a coherent demo dataset. Dates are relative to `now` so the demo always looks current.
 * Every points balance is derived from the ledger entries created here.
 */
export function createSeedDatabase(now: Date = new Date()): Database {
  const at = (daysAgo: number, hour = 11, minute = 0): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const dayStart = (offsetDays: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };
  const dayEnd = (offsetDays: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(23, 59, 59, 0);
    return d.toISOString();
  };

  const products = buildProducts(at(120, 10));
  const productByCode = (code: string): Product => {
    const product = products.find((p) => p.modelCode === code);
    if (!product) throw new Error(`Seed product ${code} missing`);
    return product;
  };

  // ---------------------------------------------------------------- Retailers
  const retailers: Retailer[] = [
    {
      id: "RTL-2001",
      shopName: "Sharma Sanitary Store",
      ownerName: "Rakesh Sharma",
      mobile: "+91 98290 41127",
      email: "sharma.sanitary@demo.levik",
      address: "14, MI Road, near Ajmeri Gate",
      city: "Jaipur",
      state: "Rajasthan",
      gstin: "08AAKFS4821L1Z3",
      distributor: "Rajputana Bath Distributors",
      registeredAt: at(210),
      verificationStatus: "Approved",
      accountStatus: "Active",
      monthlyTarget: 500000,
    },
    {
      id: "RTL-2002",
      shopName: "Gupta Bath Studio",
      ownerName: "Alok Gupta",
      mobile: "+91 94150 32876",
      email: "guptabath@demo.levik",
      address: "B-22, Aminabad Market",
      city: "Lucknow",
      state: "Uttar Pradesh",
      gstin: "09ABCPG7342M1Z8",
      distributor: "Awadh Sanitary Distributors",
      registeredAt: at(185),
      verificationStatus: "Approved",
      accountStatus: "Active",
      monthlyTarget: 400000,
    },
    {
      id: "RTL-2003",
      shopName: "Shree Ganesh Sanitary & Hardware",
      ownerName: "Mahesh Desai",
      mobile: "+91 98250 77310",
      address: "Shop 7, Relief Road",
      city: "Ahmedabad",
      state: "Gujarat",
      gstin: "24AAGFS1290K1Z6",
      distributor: "Sabarmati Trade Links",
      registeredAt: at(170),
      verificationStatus: "Approved",
      accountStatus: "Active",
      monthlyTarget: 450000,
    },
    {
      id: "RTL-2004",
      shopName: "Patel Tiles & Bath",
      ownerName: "Nilesh Patel",
      mobile: "+91 99090 15524",
      address: "Ring Road, Udhna Darwaja",
      city: "Surat",
      state: "Gujarat",
      gstin: "24AADPP5521C1Z2",
      distributor: "Sabarmati Trade Links",
      registeredAt: at(160),
      verificationStatus: "Approved",
      accountStatus: "Suspended",
      monthlyTarget: 300000,
    },
    {
      id: "RTL-2005",
      shopName: "Royal Bath Gallery",
      ownerName: "Imran Qureshi",
      mobile: "+91 98930 64412",
      email: "royalbath@demo.levik",
      address: "56, MG Road, Palasia",
      city: "Indore",
      state: "Madhya Pradesh",
      gstin: "23AAMFR8813H1Z9",
      distributor: "Malwa Building Solutions",
      registeredAt: at(150),
      verificationStatus: "Approved",
      accountStatus: "Active",
      monthlyTarget: 350000,
    },
    {
      id: "RTL-2006",
      shopName: "Deccan Sanitary Mart",
      ownerName: "Venkat Reddy",
      mobile: "+91 98490 22163",
      address: "Plot 12, Ameerpet X Roads",
      city: "Hyderabad",
      state: "Telangana",
      gstin: "36AAJFD6402N1Z4",
      distributor: "Deccan Build Supply",
      registeredAt: at(140),
      verificationStatus: "Approved",
      accountStatus: "Active",
      monthlyTarget: 300000,
    },
    {
      id: "RTL-2007",
      shopName: "Krishna Ceramics",
      ownerName: "Sunil Kulkarni",
      mobile: "+91 98220 58841",
      address: "Laxmi Road, Shaniwar Peth",
      city: "Pune",
      state: "Maharashtra",
      gstin: "27AAQFK3390D1Z1",
      distributor: "Sahyadri Bath Distributors",
      registeredAt: at(4),
      verificationStatus: "Pending",
      accountStatus: "Active",
      monthlyTarget: 250000,
    },
    {
      id: "RTL-2008",
      shopName: "New Balaji Traders",
      ownerName: "Pawan Agarwal",
      mobile: "+91 93359 40218",
      address: "Naveen Market, Mall Road",
      city: "Kanpur",
      state: "Uttar Pradesh",
      distributor: "Awadh Sanitary Distributors",
      registeredAt: at(2),
      verificationStatus: "Pending",
      accountStatus: "Active",
      monthlyTarget: 200000,
    },
  ];

  // ----------------------------------------------------------------- Plumbers
  const plumber = (
    id: string,
    name: string,
    mobile: string,
    city: string,
    state: string,
    pincode: string,
    registeredDaysAgo: number,
    extra: Partial<Plumber>,
  ): Plumber => ({
    id,
    name,
    mobile,
    city,
    state,
    pincode,
    registeredAt: at(registeredDaysAgo, 10),
    verificationStatus: "Verified",
    accountStatus: "Active",
    aadhaarMasked: `XXXX XXXX ${String(4000 + Number(id.slice(-4)) * 7).slice(-4)}`,
    experienceYears: 8,
    specialization: "Residential bathroom fitting",
    ...extra,
  });

  const plumbers: Plumber[] = [
    plumber("PLM-1001", "Ramesh Kumar", "+91 98290 11234", "Jaipur", "Rajasthan", "302001", 160, {
      experienceYears: 12,
      preferredRetailerId: "RTL-2001",
    }),
    plumber("PLM-1002", "Suresh Yadav", "+91 94150 22871", "Lucknow", "Uttar Pradesh", "226001", 150, {
      experienceYears: 9,
      preferredRetailerId: "RTL-2002",
    }),
    plumber("PLM-1003", "Mohammed Irfan", "+91 98490 31567", "Hyderabad", "Telangana", "500016", 140, {
      experienceYears: 7,
      specialization: "Commercial washrooms",
      preferredRetailerId: "RTL-2006",
    }),
    plumber("PLM-1004", "Rajesh Patel", "+91 98250 40912", "Ahmedabad", "Gujarat", "380001", 135, {
      experienceYears: 15,
      specialization: "Villa and apartment projects",
      preferredRetailerId: "RTL-2003",
    }),
    plumber("PLM-1005", "Vikram Singh", "+91 98930 52190", "Indore", "Madhya Pradesh", "452001", 130, {
      experienceYears: 10,
      preferredRetailerId: "RTL-2005",
    }),
    plumber("PLM-1006", "Anil Sharma", "+91 98290 63318", "Jaipur", "Rajasthan", "302015", 95, {
      experienceYears: 5,
      preferredRetailerId: "RTL-2001",
    }),
    plumber("PLM-1007", "Sanjay Verma", "+91 99260 71844", "Bhopal", "Madhya Pradesh", "462001", 6, {
      verificationStatus: "Pending",
      experienceYears: 4,
      preferredRetailerId: "RTL-2005",
      verificationNote: "Aadhaar OTP verified; profile photo awaiting manual review.",
    }),
    plumber("PLM-1008", "Deepak Chauhan", "+91 99090 82476", "Surat", "Gujarat", "395002", 120, {
      experienceYears: 6,
      preferredRetailerId: "RTL-2004",
    }),
    plumber("PLM-1009", "Manoj Tiwari", "+91 93350 93105", "Kanpur", "Uttar Pradesh", "208001", 110, {
      accountStatus: "Suspended",
      experienceYears: 11,
      verificationNote: "Suspended pending investigation of repeated serial scans.",
    }),
    plumber("PLM-1010", "Srinivas Rao", "+91 98480 10467", "Vijayawada", "Andhra Pradesh", "520002", 18, {
      verificationStatus: "Pending",
      experienceYears: 3,
      specialization: "Kitchen and utility fittings",
    }),
    plumber("PLM-1011", "Harpreet Singh", "+91 98140 21593", "Ludhiana", "Punjab", "141001", 70, {
      verificationStatus: "Rejected",
      accountStatus: "Inactive",
      experienceYears: 2,
      verificationNote: "Name on Aadhaar did not match the registered profile.",
    }),
    plumber("PLM-1012", "Prakash Jadhav", "+91 98220 32659", "Pune", "Maharashtra", "411002", 100, {
      experienceYears: 8,
    }),
  ];

  // ------------------------------------------------------------------- Ledger
  const ledger: PointsTransaction[] = [];
  let txnSeq = 90000;
  const post = (
    userId: ID,
    userRole: UserRole,
    source: PointsSource,
    amount: number,
    createdAt: string,
    note: string,
    createdBy: string,
    related?: { type: RelatedEntityType; id: ID },
  ): PointsTransaction => {
    txnSeq += 1;
    const txn: PointsTransaction = {
      id: `TXN-${txnSeq}`,
      userId,
      userRole,
      source,
      related,
      credit: amount > 0 ? amount : 0,
      debit: amount < 0 ? -amount : 0,
      createdAt,
      status: "Posted",
      note,
      createdBy,
    };
    ledger.push(txn);
    return txn;
  };

  const openingBalances: Array<[ID, UserRole, number]> = [
    ["PLM-1001", "plumber", 2500],
    ["PLM-1002", "plumber", 6800],
    ["PLM-1003", "plumber", 4200],
    ["PLM-1004", "plumber", 5600],
    ["PLM-1005", "plumber", 16000],
    ["PLM-1006", "plumber", 1200],
    ["PLM-1008", "plumber", 3000],
    ["PLM-1009", "plumber", 900],
    ["PLM-1012", "plumber", 800],
    ["RTL-2001", "retailer", 3000],
    ["RTL-2002", "retailer", 4500],
    ["RTL-2003", "retailer", 2000],
    ["RTL-2004", "retailer", 1000],
    ["RTL-2005", "retailer", 6500],
    ["RTL-2006", "retailer", 1500],
  ];
  for (const [userId, role, amount] of openingBalances) {
    post(userId, role, "Opening Balance", amount, at(90, 9), "Balance migrated from the pilot loyalty programme (demo)", SYSTEM);
  }

  // ------------------------------------------------------------------ Audit
  const auditLogs: AuditLog[] = [];
  let auditSeq = 100000;
  const audit = (
    when: string,
    admin: string,
    action: string,
    entityType: AuditEntityType,
    entityId: ID,
    summary: string,
  ) => {
    auditSeq += 1;
    auditLogs.push({ id: `AUD-${auditSeq}`, at: when, admin, action, entityType, entityId, summary });
  };

  // ------------------------------------------------------------------- Scans
  interface ScanSeed {
    id: string;
    plumberId: string;
    code: string;
    serial: string;
    daysAgo: number;
    retailerId?: string;
    invoiceNumber?: string;
    site: string;
    status: ProductScan["status"];
    reason?: string;
  }
  const scanSeeds: ScanSeed[] = [
    { id: "SCN-5001", plumberId: "PLM-1001", code: "1012", serial: "LVK-1012-A4C9T1", daysAgo: 22, retailerId: "RTL-2001", invoiceNumber: "SSS/25-26/0388", site: "Vaishali Nagar, Jaipur", status: "Approved" },
    { id: "SCN-5002", plumberId: "PLM-1001", code: "1005", serial: "LVK-1005-B7D2K8", daysAgo: 19, retailerId: "RTL-2001", invoiceNumber: "SSS/25-26/0388", site: "Malviya Nagar, Jaipur", status: "Approved" },
    { id: "SCN-5003", plumberId: "PLM-1001", code: "205", serial: "LVK-205-C1H6P3", daysAgo: 15, retailerId: "RTL-2001", invoiceNumber: "SSS/25-26/0402", site: "C-Scheme, Jaipur", status: "Approved" },
    { id: "SCN-5004", plumberId: "PLM-1001", code: "1020", serial: "LVK-1020-D8M3Q5", daysAgo: 10, retailerId: "RTL-2001", invoiceNumber: "SSS/25-26/0402", site: "Mansarovar, Jaipur", status: "Approved" },
    { id: "SCN-5005", plumberId: "PLM-1001", code: "9001", serial: "LVK-9001-E2N7R4", daysAgo: 8, retailerId: "RTL-2001", site: "Mansarovar, Jaipur", status: "Approved" },
    { id: "SCN-5006", plumberId: "PLM-1001", code: "206", serial: "LVK-206-F5P1S9", daysAgo: 6, retailerId: "RTL-2001", site: "Jagatpura, Jaipur", status: "Approved" },
    { id: "SCN-5007", plumberId: "PLM-1001", code: "1012", serial: "LVK-1012-K7Q2M9", daysAgo: 1, retailerId: "RTL-2001", invoiceNumber: "SSS/25-26/0431", site: "Raja Park, Jaipur", status: "Pending" },
    { id: "SCN-5008", plumberId: "PLM-1006", code: "1005", serial: "LVK-1005-G3R8V2", daysAgo: 30, retailerId: "RTL-2001", site: "Sodala, Jaipur", status: "Approved" },
    { id: "SCN-5009", plumberId: "PLM-1006", code: "108", serial: "LVK-108-H6S4W7", daysAgo: 13, retailerId: "RTL-2001", site: "Tonk Road, Jaipur", status: "Approved" },
    { id: "SCN-5010", plumberId: "PLM-1002", code: "1008", serial: "LVK-1008-J9T5X1", daysAgo: 24, retailerId: "RTL-2002", invoiceNumber: "GBS/25-26/0187", site: "Gomti Nagar, Lucknow", status: "Approved" },
    { id: "SCN-5011", plumberId: "PLM-1002", code: "6002", serial: "LVK-6002-K2V6Y8", daysAgo: 20, retailerId: "RTL-2002", invoiceNumber: "GBS/25-26/0187", site: "Indira Nagar, Lucknow", status: "Approved" },
    { id: "SCN-5012", plumberId: "PLM-1004", code: "1018", serial: "LVK-1018-L5W2Z3", daysAgo: 38, retailerId: "RTL-2003", invoiceNumber: "SGS/25-26/1142", site: "Satellite, Ahmedabad", status: "Approved" },
    { id: "SCN-5013", plumberId: "PLM-1004", code: "1020", serial: "LVK-1020-M8X7A6", daysAgo: 3, retailerId: "RTL-2003", invoiceNumber: "SGS/25-26/1198", site: "Bopal, Ahmedabad", status: "Pending" },
    { id: "SCN-5014", plumberId: "PLM-1005", code: "1012", serial: "LVK-1012-N1Y3B4", daysAgo: 11, retailerId: "RTL-2005", invoiceNumber: "RBG/25-26/0573", site: "Vijay Nagar, Indore", status: "Approved" },
    { id: "SCN-5015", plumberId: "PLM-1003", code: "205", serial: "LVK-205-C1H6P3", daysAgo: 2, retailerId: "RTL-2006", site: "Kukatpally, Hyderabad", status: "Pending" },
    { id: "SCN-5016", plumberId: "PLM-1008", code: "515", serial: "LVK-515-P4Z9C2", daysAgo: 45, retailerId: "RTL-2004", invoiceNumber: "PTB/25-26/0091", site: "Adajan, Surat", status: "Approved" },
    { id: "SCN-5017", plumberId: "PLM-1009", code: "1012", serial: "LVK-1012-Q7A1D5", daysAgo: 35, site: "Kidwai Nagar, Kanpur", status: "Flagged", reason: "Six serials from the same batch scanned within 10 minutes from one device." },
    { id: "SCN-5018", plumberId: "PLM-1009", code: "1020", serial: "LVK-1020-R2B5E8", daysAgo: 35, site: "Kidwai Nagar, Kanpur", status: "Rejected", reason: "Serial code not found in Levik dispatch records." },
    { id: "SCN-5019", plumberId: "PLM-1007", code: "1008", serial: "LVK-1008-S5C8F1", daysAgo: 4, retailerId: "RTL-2005", invoiceNumber: "RBG/25-26/0588", site: "Arera Colony, Bhopal", status: "Pending" },
    { id: "SCN-5020", plumberId: "PLM-1010", code: "103", serial: "LVK-103-T8D2G4", daysAgo: 16, site: "Benz Circle, Vijayawada", status: "Flagged", reason: "No retailer or invoice reference supplied as proof of sale." },
    { id: "SCN-5021", plumberId: "PLM-1011", code: "URN-FB", serial: "LVK-URN-U1E6H7", daysAgo: 50, site: "Sarabha Nagar, Ludhiana", status: "Rejected", reason: "Plumber KYC was rejected; scan cannot be credited." },
    { id: "SCN-5022", plumberId: "PLM-1012", code: "1018", serial: "LVK-1018-V4F9J1", daysAgo: 28, retailerId: "RTL-2003", site: "Kothrud, Pune", status: "Rejected", reason: "Installation photo shows a different model from the scanned code." },
    { id: "SCN-5023", plumberId: "PLM-1012", code: "101", serial: "LVK-101-W7G3K5", daysAgo: 18, retailerId: "RTL-2003", site: "Baner, Pune", status: "Approved" },
  ];

  const scans: ProductScan[] = scanSeeds.map((s, index) => {
    const product = productByCode(s.code);
    const scannedAt = at(s.daysAgo, 9 + (index % 8), (index * 7) % 60);
    const reviewedAt = at(Math.max(s.daysAgo - 1, 0), 16, (index * 11) % 60);
    const history: StatusEvent[] = [{ at: scannedAt, by: SYSTEM, action: "Scan submitted from plumber app" }];
    const scan: ProductScan = {
      id: s.id,
      plumberId: s.plumberId,
      productId: product.id,
      submittedCode: s.serial,
      scannedAt,
      retailerId: s.retailerId,
      invoiceNumber: s.invoiceNumber,
      siteLocation: s.site,
      status: s.status,
      history,
    };
    const reviewer = index % 3 === 0 ? SENIOR_REVIEWER : DEMO_ADMIN.name;
    if (s.status === "Approved") {
      const txn = post(s.plumberId, "plumber", "Product Scan", product.plumberPoints, reviewedAt, `Approved scan of model ${product.modelCode}`, reviewer, { type: "scan", id: s.id });
      scan.awardedPoints = product.plumberPoints;
      scan.ledgerTxnId = txn.id;
      scan.reviewedBy = reviewer;
      scan.reviewedAt = reviewedAt;
      history.push({ at: reviewedAt, by: reviewer, action: "Approved", note: `${product.plumberPoints} points credited` });
      audit(reviewedAt, reviewer, "Scan approved", "Scan", s.id, `${product.plumberPoints} points credited to ${s.plumberId}`);
    } else if (s.status === "Rejected") {
      scan.rejectionReason = s.reason;
      scan.reviewedBy = reviewer;
      scan.reviewedAt = reviewedAt;
      history.push({ at: reviewedAt, by: reviewer, action: "Rejected", note: s.reason });
      audit(reviewedAt, reviewer, "Scan rejected", "Scan", s.id, s.reason ?? "");
    } else if (s.status === "Flagged") {
      scan.flagReason = s.reason;
      scan.reviewedBy = reviewer;
      scan.reviewedAt = reviewedAt;
      history.push({ at: reviewedAt, by: reviewer, action: "Flagged for investigation", note: s.reason });
      audit(reviewedAt, reviewer, "Scan flagged", "Scan", s.id, s.reason ?? "");
    }
    return scan;
  });

  // ---------------------------------------------------------------- Invoices
  interface InvoiceSeed {
    id: string;
    invoiceNumber: string;
    retailerId: string;
    buyerName: string;
    invoiceDaysAgo: number;
    submittedDaysAgo: number;
    status: Invoice["status"];
    lines: Array<[string, number]>;
    reason?: string;
  }
  const invoiceSeeds: InvoiceSeed[] = [
    { id: "INV-3001", invoiceNumber: "SSS/25-26/0388", retailerId: "RTL-2001", buyerName: "Kanha Residency (via Ramesh Kumar)", invoiceDaysAgo: 18, submittedDaysAgo: 17, status: "Approved", lines: [["1012", 4], ["1005", 3], ["9001", 4]] },
    { id: "INV-3002", invoiceNumber: "SSS/25-26/0402", retailerId: "RTL-2001", buyerName: "Shubh Villas Pvt Ltd", invoiceDaysAgo: 9, submittedDaysAgo: 8, status: "Approved", lines: [["205", 3], ["1020", 2], ["101", 5]] },
    { id: "INV-3003", invoiceNumber: "GBS/25-26/0187", retailerId: "RTL-2002", buyerName: "Awadh Heights Builders", invoiceDaysAgo: 25, submittedDaysAgo: 24, status: "Approved", lines: [["1008", 5], ["6002", 6]] },
    { id: "INV-3004", invoiceNumber: "SGS/25-26/1142", retailerId: "RTL-2003", buyerName: "Riverfront Homes", invoiceDaysAgo: 40, submittedDaysAgo: 39, status: "Approved", lines: [["1018", 3], ["9002", 5]] },
    { id: "INV-3005", invoiceNumber: "PTB/25-26/0091", retailerId: "RTL-2004", buyerName: "Surat Municipal School Project", invoiceDaysAgo: 55, submittedDaysAgo: 54, status: "Approved", lines: [["515", 10], ["ORS-23", 12]] },
    { id: "INV-3006", invoiceNumber: "RBG/25-26/0573", retailerId: "RTL-2005", buyerName: "Vijay Nagar Apartments", invoiceDaysAgo: 12, submittedDaysAgo: 11, status: "Approved", lines: [["1012", 3], ["103", 4]] },
    { id: "INV-3007", invoiceNumber: "RBG/25-26/0588", retailerId: "RTL-2005", buyerName: "Arera Colony Bungalow", invoiceDaysAgo: 6, submittedDaysAgo: 5, status: "More Information Required", lines: [["205", 4]], reason: "Uploaded copy is cropped. Please upload the full invoice showing GSTIN and buyer details." },
    { id: "INV-3008", invoiceNumber: "SGS/25-26/1198", retailerId: "RTL-2003", buyerName: "Bopal Greens Society", invoiceDaysAgo: 4, submittedDaysAgo: 3, status: "Under Review", lines: [["1020", 2], ["105", 4]] },
    { id: "INV-3009", invoiceNumber: "SSS/25-26/0431", retailerId: "RTL-2001", buyerName: "Raja Park Duplex (via Ramesh Kumar)", invoiceDaysAgo: 2, submittedDaysAgo: 1, status: "Submitted", lines: [["1012", 2], ["206", 2], ["108", 3]] },
    { id: "INV-3010", invoiceNumber: "GBS/25-26/0187", retailerId: "RTL-2002", buyerName: "Walk-in customer", invoiceDaysAgo: 1, submittedDaysAgo: 0, status: "Submitted", lines: [["1008", 2]] },
    { id: "INV-3011", invoiceNumber: "DSM/25-26/0244", retailerId: "RTL-2006", buyerName: "Ameerpet Commercial Complex", invoiceDaysAgo: 15, submittedDaysAgo: 14, status: "Rejected", lines: [["URN-FB", 6]], reason: "GSTIN on the invoice does not match the registered shop GSTIN." },
  ];

  const rate = 1; // retailer points per ₹100, mirrored in settings below
  const invoices: Invoice[] = invoiceSeeds.map((s, index) => {
    const lineItems: InvoiceLineItem[] = s.lines.map(([code, quantity], lineIndex) => {
      const product = productByCode(code);
      return { id: `${s.id}-L${lineIndex + 1}`, productId: product.id, quantity, unitPrice: product.mrp };
    });
    const submittedAt = at(s.submittedDaysAgo, 12, (index * 13) % 60);
    const invoice: Invoice = {
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      retailerId: s.retailerId,
      buyerName: s.buyerName,
      invoiceDate: at(s.invoiceDaysAgo, 10),
      submittedAt,
      status: s.status,
      lineItems,
      history: [{ at: submittedAt, by: SYSTEM, action: "Invoice submitted from retailer app" }],
    };
    const reviewedAt = at(Math.max(s.submittedDaysAgo - 1, 0), 15, (index * 17) % 60);
    const reviewer = index % 2 === 0 ? SENIOR_REVIEWER : DEMO_ADMIN.name;
    if (s.status === "Approved") {
      const eligibleValue = lineItems.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      const points = Math.floor((eligibleValue / 100) * rate);
      const txn = post(s.retailerId, "retailer", "Invoice Incentive", points, reviewedAt, `Incentive for invoice ${s.invoiceNumber}`, reviewer, { type: "invoice", id: s.id });
      Object.assign(invoice, { reviewer, reviewedAt, incentivePoints: points, ledgerTxnId: txn.id });
      invoice.history.push({ at: reviewedAt, by: reviewer, action: "Approved", note: `${points} incentive points credited` });
      audit(reviewedAt, reviewer, "Invoice approved", "Invoice", s.id, `${points} points credited to ${s.retailerId}`);
    } else if (s.status === "Rejected") {
      Object.assign(invoice, { reviewer, reviewedAt, rejectionReason: s.reason });
      invoice.history.push({ at: reviewedAt, by: reviewer, action: "Rejected", note: s.reason });
      audit(reviewedAt, reviewer, "Invoice rejected", "Invoice", s.id, s.reason ?? "");
    } else if (s.status === "More Information Required") {
      Object.assign(invoice, { reviewer, reviewedAt, infoRequest: s.reason });
      invoice.history.push({ at: reviewedAt, by: reviewer, action: "More information requested", note: s.reason });
      audit(reviewedAt, reviewer, "Invoice info requested", "Invoice", s.id, s.reason ?? "");
    } else if (s.status === "Under Review") {
      Object.assign(invoice, { reviewer: DEMO_ADMIN.name });
      invoice.history.push({ at: reviewedAt, by: DEMO_ADMIN.name, action: "Moved to review" });
    }
    return invoice;
  });

  // ----------------------------------------------------------------- Schemes
  const schemes: Scheme[] = [
    {
      id: "SCH-401",
      name: "Festive Retail Booster",
      description: "Retailers who sell ₹2,50,000 of eligible western and wall-hung WCs during the festive window earn a one-time bonus.",
      role: "retailer",
      startDate: dayStart(-20),
      endDate: dayEnd(40),
      eligibleCategories: ["One-Piece Western WC", "Wall-Hung WC"],
      targetType: "Sales Amount",
      targetValue: 250000,
      incentivePoints: 5000,
      status: "Active",
      awardedUserIds: [],
      createdAt: at(30),
      updatedAt: at(20),
    },
    {
      id: "SCH-402",
      name: "Festive Fitter Challenge",
      description: "Plumbers who complete 6 approved WC installations during the campaign earn bonus points.",
      role: "plumber",
      startDate: dayStart(-25),
      endDate: dayEnd(35),
      eligibleCategories: ["One-Piece Western WC", "Wall-Hung WC"],
      targetType: "Approved Scans",
      targetValue: 6,
      incentivePoints: 1000,
      status: "Active",
      awardedUserIds: [],
      createdAt: at(32),
      updatedAt: at(25),
    },
    {
      id: "SCH-403",
      name: "Basin Bonanza",
      description: "Upcoming retailer scheme for half-pedestal, pedestal, wall-hung and countertop basins.",
      role: "retailer",
      startDate: dayStart(10),
      endDate: dayEnd(70),
      eligibleCategories: ["Half-Pedestal Basin", "Pedestal Basin", "Wall-Hung Basin", "Countertop Basin"],
      targetType: "Sales Amount",
      targetValue: 100000,
      incentivePoints: 2000,
      status: "Scheduled",
      awardedUserIds: [],
      createdAt: at(5),
      updatedAt: at(5),
    },
    {
      id: "SCH-404",
      name: "Monsoon Basin & Pan Week",
      description: "Completed retailer scheme for basins and Indian pans.",
      role: "retailer",
      startDate: dayStart(-60),
      endDate: dayEnd(-35),
      eligibleCategories: ["Half-Pedestal Basin", "Wall-Hung Basin", "Indian Pan"],
      targetType: "Sales Amount",
      targetValue: 30000,
      incentivePoints: 1500,
      status: "Completed",
      awardedUserIds: ["RTL-2004"],
      createdAt: at(70),
      updatedAt: at(34),
    },
    {
      id: "SCH-405",
      name: "Wall-Hung Pro Installer",
      description: "Draft plumber campaign rewarding 10 approved wall-hung WC installations.",
      role: "plumber",
      startDate: dayStart(20),
      endDate: dayEnd(80),
      eligibleCategories: ["Wall-Hung WC"],
      targetType: "Approved Scans",
      targetValue: 10,
      incentivePoints: 1500,
      status: "Draft",
      awardedUserIds: [],
      createdAt: at(1),
      updatedAt: at(1),
    },
  ];
  post("RTL-2004", "retailer", "Scheme Bonus", 1500, at(54, 17), "Target achieved: Monsoon Basin & Pan Week", SENIOR_REVIEWER, { type: "scheme", id: "SCH-404" });
  audit(at(54, 17), SENIOR_REVIEWER, "Scheme bonus credited", "Scheme", "SCH-404", "1500 points credited to RTL-2004");
  audit(at(30), SENIOR_REVIEWER, "Scheme created", "Scheme", "SCH-401", "Festive Retail Booster created as Draft");
  audit(at(20), SENIOR_REVIEWER, "Scheme activated", "Scheme", "SCH-401", "Festive Retail Booster activated");
  audit(at(25), DEMO_ADMIN.name, "Scheme activated", "Scheme", "SCH-402", "Festive Fitter Challenge activated");
  audit(at(1), DEMO_ADMIN.name, "Scheme created", "Scheme", "SCH-405", "Wall-Hung Pro Installer saved as Draft");

  // ----------------------------------------------------------------- Rewards
  const reward = (
    id: string,
    name: string,
    category: Reward["category"],
    type: Reward["type"],
    pointsRequired: number,
    stock: number,
    description: string,
    eligibleRoles: UserRole[] = ["plumber", "retailer"],
    isActive = true,
  ): Reward => ({
    id,
    name,
    category,
    type,
    description,
    pointsRequired,
    stock,
    isActive,
    eligibleRoles,
    createdAt: at(100),
    updatedAt: at(100),
  });
  const rewards: Reward[] = [
    reward("RWD-6001", "E-Shopping Voucher ₹500", "Shopping Voucher", "Digital", 500, 198, "Digital voucher code delivered by SMS (simulated)."),
    reward("RWD-6002", "Multi-Brand Gift Card ₹1,000", "Gift Card", "Digital", 1000, 119, "Gift card usable across partner retail brands (simulated)."),
    reward("RWD-6003", "Fuel Card ₹2,000", "Gift Card", "Digital", 2000, 59, "Prepaid fuel card for two-wheelers and cars (simulated)."),
    reward("RWD-6004", "Premium Plumbing Toolkit", "Tools & Equipment", "Physical", 2500, 12, "42-piece professional toolkit with pipe wrench and cutter.", ["plumber"]),
    reward("RWD-6005", "Mixer Grinder 750W", "Home Appliance", "Physical", 4000, 17, "Three-jar mixer grinder."),
    reward("RWD-6006", "32-inch Smart LED TV", "Television", "Physical", 15000, 5, "HD-ready smart television with wall mount."),
    reward("RWD-6007", "Double-Door Refrigerator 260L", "Refrigerator", "Physical", 25000, 4, "Frost-free double-door refrigerator."),
    reward("RWD-6008", "1.5 Ton Inverter Split AC", "Air Conditioner", "Physical", 40000, 3, "3-star inverter split air conditioner with standard installation."),
    reward("RWD-6009", "Weekend Getaway for Two", "Other", "Physical", 30000, 0, "Two-night resort stay. Paused for the season.", ["retailer"], false),
  ];

  // ------------------------------------------------------------- Redemptions
  interface RedemptionSeed {
    id: string;
    userId: string;
    role: UserRole;
    rewardId: string;
    daysAgo: number;
    status: RedemptionStatus;
    address: string;
    reason?: string;
  }
  const redemptionSeeds: RedemptionSeed[] = [
    { id: "RDM-7001", userId: "PLM-1005", role: "plumber", rewardId: "RWD-6006", daysAgo: 50, status: "Delivered", address: "22, Scheme 54, Vijay Nagar, Indore 452010" },
    { id: "RDM-7002", userId: "PLM-1002", role: "plumber", rewardId: "RWD-6005", daysAgo: 9, status: "Dispatched", address: "4/118, Vikas Nagar, Lucknow 226022" },
    { id: "RDM-7003", userId: "PLM-1004", role: "plumber", rewardId: "RWD-6001", daysAgo: 30, status: "Delivered", address: "SMS: +91 98250 40912" },
    { id: "RDM-7004", userId: "PLM-1004", role: "plumber", rewardId: "RWD-6004", daysAgo: 1, status: "Requested", address: "B-9, Shyamal Row Houses, Satellite, Ahmedabad 380015" },
    { id: "RDM-7005", userId: "PLM-1003", role: "plumber", rewardId: "RWD-6002", daysAgo: 5, status: "Processing", address: "SMS: +91 98490 31567" },
    { id: "RDM-7006", userId: "PLM-1001", role: "plumber", rewardId: "RWD-6007", daysAgo: 3, status: "Requested", address: "88, Gopalpura Bypass, Jaipur 302018" },
    { id: "RDM-7007", userId: "RTL-2005", role: "retailer", rewardId: "RWD-6003", daysAgo: 4, status: "Approved", address: "56, MG Road, Palasia, Indore 452001" },
    { id: "RDM-7008", userId: "RTL-2002", role: "retailer", rewardId: "RWD-6002", daysAgo: 14, status: "Cancelled", address: "B-22, Aminabad Market, Lucknow 226018", reason: "Retailer asked to switch to a physical reward." },
    { id: "RDM-7009", userId: "PLM-1008", role: "plumber", rewardId: "RWD-6001", daysAgo: 20, status: "Failed", address: "SMS: +91 99090 82476", reason: "Voucher provider returned an error (simulated). Points refunded." },
    { id: "RDM-7010", userId: "PLM-1006", role: "plumber", rewardId: "RWD-6001", daysAgo: 0, status: "Requested", address: "SMS: +91 98290 63318" },
  ];
  const ORDER: RedemptionStatus[] = ["Requested", "Approved", "Processing", "Dispatched", "Delivered"];
  const redemptions: Redemption[] = redemptionSeeds.map((s, index) => {
    const rw = rewards.find((r) => r.id === s.rewardId)!;
    const requestedAt = at(s.daysAgo, 13, (index * 9) % 60);
    const redemption: Redemption = {
      id: s.id,
      userId: s.userId,
      userRole: s.role,
      rewardId: s.rewardId,
      pointsCost: rw.pointsRequired,
      requestedAt,
      status: s.status,
      deliveryAddress: s.address,
      history: [{ at: requestedAt, by: SYSTEM, action: "Redemption requested from app" }],
    };
    const step = (n: number) => at(Math.max(s.daysAgo - n, 0), 15 + n, 0);
    const reached = s.status === "Cancelled" || s.status === "Failed" ? 2 : ORDER.indexOf(s.status);
    if (reached >= 1) {
      const txn = post(s.userId, s.role, "Redemption", -rw.pointsRequired, step(0), `Redeemed: ${rw.name}`, DEMO_ADMIN.name, { type: "redemption", id: s.id });
      redemption.debitTxnId = txn.id;
      redemption.history.push({ at: step(0), by: DEMO_ADMIN.name, action: "Approved", note: `${rw.pointsRequired} points deducted` });
      audit(step(0), DEMO_ADMIN.name, "Redemption approved", "Redemption", s.id, `${rw.pointsRequired} points deducted from ${s.userId}`);
    }
    if (reached >= 2) {
      redemption.fulfilmentRef = `FUL-${s.id.slice(4)}`;
      redemption.history.push({ at: step(1), by: DEMO_ADMIN.name, action: "Processing", note: `Fulfilment reference ${redemption.fulfilmentRef}` });
    }
    if (s.status === "Dispatched" || s.status === "Delivered") {
      if (rw.type === "Physical") {
        redemption.courierName = "Levik Demo Logistics";
        redemption.trackingNumber = `LDL${s.id.slice(4)}88${index}`;
        redemption.history.push({ at: step(2), by: DEMO_ADMIN.name, action: "Dispatched", note: `Tracking ${redemption.trackingNumber}` });
      } else {
        redemption.voucherCode = `DEMO-${s.id.slice(4)}-XXXX`;
      }
    }
    if (s.status === "Delivered") {
      redemption.history.push({ at: step(3), by: DEMO_ADMIN.name, action: "Delivered" });
    }
    if (s.status === "Cancelled" || s.status === "Failed") {
      const reversal = post(s.userId, s.role, "Redemption Reversal", rw.pointsRequired, step(2), `Refund for ${s.status.toLowerCase()} redemption ${s.id}`, DEMO_ADMIN.name, { type: "redemption", id: s.id });
      redemption.reversalTxnId = reversal.id;
      redemption.cancelReason = s.reason;
      redemption.history.push({ at: step(2), by: DEMO_ADMIN.name, action: s.status, note: s.reason });
      audit(step(2), DEMO_ADMIN.name, `Redemption ${s.status.toLowerCase()}`, "Redemption", s.id, `${rw.pointsRequired} points refunded to ${s.userId}`);
    }
    return redemption;
  });

  // --------------------------------------------------------------- Inventory
  const inventorySeeds: Array<[string, string, number, number]> = [
    ["RTL-2001", "1012", 14, 2],
    ["RTL-2001", "1005", 6, 5],
    ["RTL-2001", "205", 3, 3],
    ["RTL-2001", "101", 22, 9],
    ["RTL-2001", "9001", 0, 7],
    ["RTL-2002", "1008", 9, 4],
    ["RTL-2002", "6002", 25, 11],
    ["RTL-2002", "515", 4, 6],
    ["RTL-2003", "1018", 7, 3],
    ["RTL-2003", "9002", 11, 12],
    ["RTL-2003", "1020", 2, 1],
    ["RTL-2005", "1012", 5, 2],
    ["RTL-2005", "103", 16, 8],
    ["RTL-2005", "205", 8, 6],
    ["RTL-2006", "205", 12, 10],
    ["RTL-2006", "URN-FB", 9, 15],
  ];
  const inventory: InventoryItem[] = inventorySeeds.map(([retailerId, code, quantity, daysAgo], index) => ({
    id: `STK-${index + 1}`,
    retailerId,
    productId: productByCode(code).id,
    quantity,
    updatedAt: at(daysAgo, 18),
    updatedBy: "Retailer app",
  }));

  // ----------------------------------------------------------------- Tickets
  const tickets: SupportTicket[] = [
    {
      id: "TKT-8001",
      userId: "PLM-1001",
      userRole: "plumber",
      subject: "Points not yet credited for 1012 installation",
      category: "Scan",
      description: "Scanned a 1012 WC at Raja Park yesterday. Status still shows pending.",
      priority: "Medium",
      status: "Open",
      createdAt: at(0, 9),
      updatedAt: at(0, 9),
      notes: [],
    },
    {
      id: "TKT-8002",
      userId: "RTL-2002",
      userRole: "retailer",
      subject: "Second invoice upload shows duplicate warning",
      category: "Invoice",
      description: "We uploaded a new invoice and the app says the number already exists.",
      priority: "Medium",
      status: "In Progress",
      createdAt: at(0, 10),
      updatedAt: at(0, 11),
      notes: [{ at: at(0, 11), by: DEMO_ADMIN.name, text: "Checking invoice GBS/25-26/0187 against the earlier approved invoice." }],
    },
    {
      id: "TKT-8003",
      userId: "PLM-1002",
      userRole: "plumber",
      subject: "Delivery date for mixer grinder",
      category: "Redemption",
      description: "When will my mixer grinder be delivered?",
      priority: "Low",
      status: "In Progress",
      createdAt: at(3, 14),
      updatedAt: at(2, 12),
      notes: [{ at: at(2, 12), by: SENIOR_REVIEWER, text: "Dispatched via Levik Demo Logistics. Shared tracking number with the plumber." }],
    },
    {
      id: "TKT-8004",
      userId: "PLM-1007",
      userRole: "plumber",
      subject: "KYC verification pending for several days",
      category: "Account",
      description: "Aadhaar OTP was successful but the profile still shows verification pending.",
      priority: "High",
      status: "Open",
      createdAt: at(2, 16),
      updatedAt: at(2, 16),
      notes: [],
    },
    {
      id: "TKT-8005",
      userId: "RTL-2005",
      userRole: "retailer",
      subject: "Need updated wall-hung catalogue",
      category: "Product",
      description: "Please share the latest catalogue PDF for wall-hung WCs.",
      priority: "Low",
      status: "Resolved",
      createdAt: at(12, 11),
      updatedAt: at(11, 15),
      notes: [{ at: at(11, 15), by: DEMO_ADMIN.name, text: "Shared the Bathware Collection catalogue with the retailer." }],
    },
    {
      id: "TKT-8006",
      userId: "PLM-1008",
      userRole: "plumber",
      subject: "Voucher failed – were my points refunded?",
      category: "Redemption",
      description: "The voucher did not arrive and the app shows failed.",
      priority: "Medium",
      status: "Closed",
      createdAt: at(19, 10),
      updatedAt: at(18, 12),
      notes: [{ at: at(18, 12), by: DEMO_ADMIN.name, text: "Confirmed 500 points were refunded via a reversal entry." }],
    },
  ];

  // -------------------------------------------------------------- Misc audit
  audit(at(120, 10), SENIOR_REVIEWER, "Product catalogue imported", "Product", "PRD-101", `${products.length} products imported from the Bathware Collection catalogue`);
  audit(at(60, 12), SENIOR_REVIEWER, "Product deactivated", "Product", "PRD-108", "Wall-Hung WC 201 marked inactive (discontinued in demo data)");
  audit(at(70, 15), DEMO_ADMIN.name, "Plumber verification rejected", "Plumber", "PLM-1011", "Name on Aadhaar did not match the registered profile.");
  audit(at(34, 11), SENIOR_REVIEWER, "Plumber account suspended", "Plumber", "PLM-1009", "Repeated serial scans under investigation.");
  audit(at(150, 11), SENIOR_REVIEWER, "Retailer approved", "Retailer", "RTL-2005", "Royal Bath Gallery approved after GST verification");
  audit(at(21, 10), DEMO_ADMIN.name, "Retailer account suspended", "Retailer", "RTL-2004", "GST return filing under verification");

  auditLogs.sort((a, b) => b.at.localeCompare(a.at));
  ledger.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    version: DEMO_DATA_VERSION,
    seededAt: now.toISOString(),
    settings: {
      programmeName: "Levik Rewards Programme",
      adminName: DEMO_ADMIN.name,
      adminEmail: DEMO_ADMIN.email,
      retailerPointsPer100: rate,
      lowStockThreshold: 5,
      notifications: { pendingScans: true, pendingInvoices: true, redemptions: true, lowStock: true },
    },
    plumbers,
    retailers,
    products,
    scans,
    invoices,
    rewards,
    redemptions,
    schemes,
    inventory,
    ledger,
    tickets,
    auditLogs,
    counters: {
      PLM: 1012,
      RTL: 2008,
      PRD: 100 + products.length,
      SCN: 5023,
      INV: 3011,
      RWD: 6009,
      RDM: 7010,
      SCH: 405,
      STK: inventory.length,
      TKT: 8006,
      TXN: txnSeq,
      AUD: auditSeq,
    },
  };
}
