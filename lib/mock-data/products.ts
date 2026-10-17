import type { Product, ProductCategory } from "@/types";

interface ProductSeed {
  name: string;
  modelCode: string;
  category: ProductCategory;
  description: string;
  dimensions?: string;
  features?: string[];
  image?: string;
  mrp: number;
  plumberPoints: number;
  isActive?: boolean;
  rewardEligible?: boolean;
}

/**
 * Model codes, dimensions and features are taken from the Levik Bathware catalogue.
 * MRP and plumber points are sample demo values, not official Levik pricing or programme rules.
 */
const PRODUCT_SEEDS: ProductSeed[] = [
  {
    name: "One-Piece Western WC 1005",
    modelCode: "1005",
    category: "One-Piece Western WC",
    description: "One-piece western water closet with a squared bowl profile and slim soft-close seat.",
    dimensions: "660 x 350 x 730 mm",
    image: "/images/products/1005.jpg",
    mrp: 14500,
    plumberPoints: 300,
  },
  {
    name: "One-Piece Western WC 1008",
    modelCode: "1008",
    category: "One-Piece Western WC",
    description: "One-piece western water closet with a rounded bowl and wash-down flushing.",
    dimensions: "660 x 360 x 760 mm",
    features: ['S-Trap | P-Trap (9", 12")', "Wash Down"],
    image: "/images/products/1008.jpg",
    mrp: 15900,
    plumberPoints: 320,
  },
  {
    name: "One-Piece Western WC 1012",
    modelCode: "1012",
    category: "One-Piece Western WC",
    description: "One-piece western water closet with Syphonic 5D flushing and a slim seat cover.",
    dimensions: "660 x 360 x 735 mm",
    features: ['S-Trap | P-Trap (9")', "Syphonic 5D"],
    image: "/images/products/1012.jpg",
    mrp: 18500,
    plumberPoints: 350,
  },
  {
    name: "One-Piece Western WC 1018",
    modelCode: "1018",
    category: "One-Piece Western WC",
    description: "One-piece western water closet with a sharp, square-edged contemporary design.",
    dimensions: "660 x 360 x 735 mm",
    image: "/images/products/1018.jpg",
    mrp: 16200,
    plumberPoints: 320,
  },
  {
    name: "One-Piece Western WC 1020",
    modelCode: "1020",
    category: "One-Piece Western WC",
    description: "One-piece western water closet with a tall tank and soft rounded bowl.",
    dimensions: "680 x 370 x 715 mm",
    features: ['S-Trap | P-Trap (9")'],
    image: "/images/products/1020.jpg",
    mrp: 17400,
    plumberPoints: 340,
  },
  {
    name: "Wall-Hung WC 206",
    modelCode: "206",
    category: "Wall-Hung WC",
    description: "Wall-hung water closet with a deep rounded bowl for concealed cistern installations.",
    dimensions: "490 x 350 x 365 mm",
    image: "/images/products/206.jpg",
    mrp: 11800,
    plumberPoints: 250,
  },
  {
    name: "Wall-Hung WC 205",
    modelCode: "205",
    category: "Wall-Hung WC",
    description: "Rimless wall-hung water closet designed for easier cleaning.",
    dimensions: "540 x 370 x 370 mm",
    features: ["Rimless"],
    image: "/images/products/205.jpg",
    mrp: 12900,
    plumberPoints: 260,
  },
  {
    name: "Wall-Hung WC 201",
    modelCode: "201",
    category: "Wall-Hung WC",
    description: "Wall-hung water closet with a square seat profile.",
    dimensions: "510 x 340 x 365 mm",
    image: "/images/products/201.jpg",
    mrp: 10900,
    plumberPoints: 240,
    isActive: false,
  },
  {
    name: "Floor-Mounted EWC 6002",
    modelCode: "6002",
    category: "Floor-Mounted EWC",
    description: "Floor-mounted European water closet with a square bowl.",
    dimensions: "540 x 380 x 395 mm",
    image: "/images/products/6002.jpg",
    mrp: 5200,
    plumberPoints: 120,
  },
  {
    name: "Half-Pedestal Basin 9001",
    modelCode: "9001",
    category: "Half-Pedestal Basin",
    description: "Wall-mounted wash basin with a rounded half pedestal.",
    dimensions: "550 x 410 x 475 mm",
    image: "/images/products/9001.jpg",
    mrp: 3600,
    plumberPoints: 80,
  },
  {
    name: "Half-Pedestal Basin 9002",
    modelCode: "9002",
    category: "Half-Pedestal Basin",
    description: "Wall-mounted wash basin with a squared half pedestal.",
    dimensions: "460 x 350 x 400 mm",
    image: "/images/products/9002.jpg",
    mrp: 3900,
    plumberPoints: 80,
  },
  {
    name: "Pedestal Basin 303",
    modelCode: "303",
    category: "Pedestal Basin",
    description: "Full pedestal wash basin for floor-standing installations.",
    dimensions: "400 x 500 x 720 mm",
    image: "/images/products/303-pd.jpg",
    mrp: 3200,
    plumberPoints: 70,
  },
  {
    name: "Wall-Hung Basin 515",
    modelCode: "515",
    category: "Wall-Hung Basin",
    description: "Compact wall-hung wash basin with a soft rounded front.",
    dimensions: '18" x 14"',
    image: "/images/products/515.jpg",
    mrp: 1850,
    plumberPoints: 40,
  },
  {
    name: "Countertop Basin 101",
    modelCode: "101",
    category: "Countertop Basin",
    description: "Rectangular table-top basin with a single tap hole.",
    dimensions: "470 x 360 x 130 mm",
    image: "/images/products/101.jpg",
    mrp: 3400,
    plumberPoints: 75,
  },
  {
    name: "Countertop Basin 103",
    modelCode: "103",
    category: "Countertop Basin",
    description: "Table-top basin with tapered sides and a single tap hole.",
    dimensions: "440 x 375 x 130 mm",
    image: "/images/products/103.jpg",
    mrp: 3300,
    plumberPoints: 75,
  },
  {
    name: "Countertop Basin 105",
    modelCode: "105",
    category: "Countertop Basin",
    description: "Square table-top vessel basin.",
    dimensions: "385 x 325 x 140 mm",
    image: "/images/products/105.jpg",
    mrp: 2900,
    plumberPoints: 60,
  },
  {
    name: "Countertop Basin 108",
    modelCode: "108",
    category: "Countertop Basin",
    description: "Large square table-top vessel basin.",
    dimensions: "440 x 390 x 145 mm",
    image: "/images/products/108.jpg",
    mrp: 3500,
    plumberPoints: 75,
  },
  {
    name: "Flat Back Urinal",
    modelCode: "URN-FB",
    category: "Urinal",
    description: "Wall-mounted flat back urinal for commercial washrooms.",
    dimensions: "310 x 460 x 210 mm",
    image: "/images/products/urinal-flat-back.jpg",
    mrp: 2100,
    plumberPoints: 50,
  },
  {
    name: 'Orissa Pan 23"',
    modelCode: "ORS-23",
    category: "Indian Pan",
    description: "Indian style squatting pan.",
    dimensions: '23"',
    image: "/images/products/orissa-23.jpg",
    mrp: 1450,
    plumberPoints: 30,
  },
  {
    name: "Quartz Kitchen Sink (Black)",
    modelCode: "KS-QZ",
    category: "Kitchen Sink",
    description: "Single-bowl black quartz kitchen sink.",
    image: "/images/products/sink-quartz.jpg",
    mrp: 9800,
    plumberPoints: 200,
  },
  {
    name: "PVC Cistern",
    modelCode: "CST-PVC",
    category: "Cistern",
    description: "Exposed PVC flushing cistern. Accessory item, not eligible for scan rewards.",
    image: "/images/products/cistern-pvc.jpg",
    mrp: 1650,
    plumberPoints: 0,
    rewardEligible: false,
  },
];

export function buildProducts(createdAt: string): Product[] {
  return PRODUCT_SEEDS.map((seed, index) => {
    const id = `PRD-${101 + index}`;
    const codeDigits = seed.modelCode.replace(/\D/g, "").padStart(4, "0") || String(index).padStart(4, "0");
    return {
      id,
      name: seed.name,
      modelCode: seed.modelCode,
      category: seed.category,
      description: seed.description,
      dimensions: seed.dimensions,
      features: seed.features ?? [],
      image: seed.image,
      sku: `LVK-${seed.modelCode}`,
      barcode: `89000${String(101 + index)}${codeDigits}`,
      mrp: seed.mrp,
      plumberPoints: seed.plumberPoints,
      isActive: seed.isActive ?? true,
      rewardEligible: seed.rewardEligible ?? true,
      createdAt,
      updatedAt: createdAt,
    };
  });
}
