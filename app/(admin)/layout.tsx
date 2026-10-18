import { AdminShell } from "@/components/layout/admin-shell";

/**
 * Admin pages fetch from the Levik API with the signed-in admin's bearer token (held in browser
 * memory), so they render on the client behind the shell skeleton. Opt this subtree out of Instant
 * Navigation validation accordingly.
 */
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <AdminShell>{children}</AdminShell>;
}
