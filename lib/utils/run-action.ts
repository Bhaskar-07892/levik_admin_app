"use client";

import { toast } from "sonner";
import { refreshAfterMutation } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

export type ActionResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Runs an API mutation, shows a success or error toast and refreshes the data on screen.
 * Check `.ok` before closing dialogs or navigating.
 */
export async function runAction<T>(fn: () => Promise<T>, success: string | ((result: T) => string)): Promise<ActionResult<T>> {
  try {
    const value = await fn();
    toast.success(typeof success === "function" ? success(value) : success);
    void refreshAfterMutation();
    return { ok: true, value };
  } catch (error) {
    toast.error(errorMessage(error));
    return { ok: false };
  }
}
