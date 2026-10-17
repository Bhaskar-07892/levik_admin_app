import type { Metadata } from "next";
import { AuditLogView } from "@/components/audit/audit-log-view";

export const metadata: Metadata = { title: "Audit Logs" };

export default function AuditLogsPage() {
  return <AuditLogView />;
}
