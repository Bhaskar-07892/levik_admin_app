import { z } from "zod";
import type { ImageChange } from "@/components/products/product-image-field";
import { PRODUCT_CATEGORIES, REWARD_CATEGORIES } from "@/types";

const reason = z.string().trim().min(5, "Please enter at least 5 characters.");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const reasonSchema = z.object({ reason });
export type ReasonValues = z.infer<typeof reasonSchema>;

const mobile = z
  .string()
  .trim()
  .regex(/^\+91 [6-9]\d{4} \d{5}$/, "Use the format +91 98765 43210.");

export const plumberEditSchema = z.object({
  name: z.string().trim().min(3, "Name is required."),
  mobile,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]).optional(),
  city: z.string().trim().min(2, "City is required."),
  state: z.string().trim().min(2, "State is required."),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits."),
  experienceYears: z.number({ error: "Enter years of experience." }).int().min(0).max(60),
  specialization: z.string().trim().min(3, "Specialisation is required."),
});
export type PlumberEditInput = z.infer<typeof plumberEditSchema>;

export const retailerEditSchema = z.object({
  shopName: z.string().trim().min(3, "Shop name is required."),
  ownerName: z.string().trim().min(3, "Owner name is required."),
  mobile,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]).optional(),
  address: z.string().trim().min(5, "Address is required."),
  city: z.string().trim().min(2, "City is required."),
  state: z.string().trim().min(2, "State is required."),
  gstin: z
    .union([
      z.literal(""),
      z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN."),
    ])
    .optional(),
  distributor: z.string().trim().min(3, "Distributor is required."),
  monthlyTarget: z.number({ error: "Enter a monthly target." }).int().min(10000, "Minimum target is ₹10,000."),
});
export type RetailerEditInput = z.infer<typeof retailerEditSchema>;

export const productFormSchema = z.object({
  name: z.string().trim().min(3, "Product name is required."),
  modelCode: z.string().trim().min(2, "Model code is required."),
  category: z.enum(PRODUCT_CATEGORIES, { error: "Choose a category." }),
  description: z.string().trim().min(10, "Add a short description (10+ characters)."),
  dimensions: z.string().trim().optional(),
  featuresText: z.string().optional(),
  sku: z.string().trim().min(3, "SKU is required."),
  barcode: z.string().trim().regex(/^\d{8,14}$/, "Barcode must be 8–14 digits."),
  mrp: z.number({ error: "Enter an MRP." }).int().min(1, "MRP must be positive."),
  plumberPoints: z.number({ error: "Enter scan points." }).int().min(0).max(10000),
  isActive: z.boolean(),
  rewardEligible: z.boolean(),
  /** Image picked in the form (already uploaded); see ProductImageField. */
  image: z.custom<ImageChange>(),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductInput = Omit<ProductFormValues, "featuresText" | "dimensions" | "image"> & {
  dimensions?: string;
  features: string[];
  /** Upload key of a product-image (or catalogue path); null removes the image on update. */
  imageUrl?: string | null;
};

export const rewardSchema = z.object({
  name: z.string().trim().min(3, "Reward name is required."),
  category: z.enum(REWARD_CATEGORIES, { error: "Choose a category." }),
  type: z.enum(["Digital", "Physical"]),
  description: z.string().trim().min(10, "Add a short description (10+ characters)."),
  pointsRequired: z.number({ error: "Enter points required." }).int().min(100, "Minimum 100 points."),
  stock: z.number({ error: "Enter stock." }).int().min(0, "Stock cannot be negative."),
  isActive: z.boolean(),
  eligibleRoles: z.array(z.enum(["plumber", "retailer"])).min(1, "Select at least one eligible role."),
});
export type RewardInput = z.infer<typeof rewardSchema>;

export const schemeFormSchema = z
  .object({
    name: z.string().trim().min(3, "Scheme name is required."),
    description: z.string().trim().min(10, "Add a description (10+ characters)."),
    role: z.enum(["plumber", "retailer"]),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    eligibleCategories: z.array(z.enum(PRODUCT_CATEGORIES)).min(1, "Select at least one product category."),
    targetValue: z.number({ error: "Enter a target." }).int().min(1, "Target must be at least 1."),
    incentivePoints: z.number({ error: "Enter incentive points." }).int().min(1, "Incentive must be at least 1 point."),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "End date must be on or after the start date." });
export type SchemeFormValues = z.infer<typeof schemeFormSchema>;
export type SchemeInput = Omit<SchemeFormValues, never>;

export const settingsSchema = z.object({
  adminName: z.string().trim().min(3, "Name is required."),
  programmeName: z.string().trim().min(3, "Programme name is required."),
  retailerPointsPer100: z.number({ error: "Enter a rate." }).min(0.1, "Minimum 0.1").max(20, "Maximum 20"),
  lowStockThreshold: z.number({ error: "Enter a threshold." }).int().min(0).max(1000),
  maxDailyScansPerPlumber: z.number({ error: "Enter a limit." }).int().min(1, "Minimum 1").max(500, "Maximum 500"),
});
export type SettingsValues = z.infer<typeof settingsSchema>;
