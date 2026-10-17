import { AdminShell } from "@/components/layout/admin-shell";

/**
 * Admin data lives in browser storage (mock backend), so pages render on the client behind the
 * shell skeleton. Opt this subtree out of Instant Navigation validation accordingly.
 */
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <AdminShell>{children}</AdminShell>;
}
