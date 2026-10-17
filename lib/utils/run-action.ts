"use client";

import { toast } from "sonner";

export type ActionResult<T> = { ok: true; value: T } | { ok: false };

/** Runs a mock service call and shows a success or error toast. Check `.ok` – services may return void. */
export function runAction<T>(fn: () => T, success: string | ((result: T) => string)): ActionResult<T> {
  try {
    const value = fn();
    toast.success(typeof success === "function" ? success(value) : success);
    return { ok: true, value };
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    return { ok: false };
  }
}
