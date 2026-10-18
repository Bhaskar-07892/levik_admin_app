export type Period = "7d" | "30d" | "90d" | "all";

export const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

const day = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
const month = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" });

/** Chart label for an API trend bucket ("YYYY-MM-DD" start date in IST) of the given size. */
export function bucketLabel(bucket: string, size: string): string {
  const date = new Date(`${bucket}T00:00:00+05:30`);
  if (size === "month") return month.format(date);
  if (size === "week") return `Wk of ${day.format(date)}`;
  return day.format(date);
}

/** Bucket size the API uses for each period (mirrors the API's resolvePeriod). */
export const PERIOD_BUCKET: Record<Period, "day" | "week" | "month"> = { "7d": "day", "30d": "day", "90d": "week", all: "month" };
