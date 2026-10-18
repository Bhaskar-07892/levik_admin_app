import type { Metadata } from "next";
import { LedgerView } from "@/components/ledger/ledger-view";

export const metadata: Metadata = { title: "Points Ledger" };

export default async function LedgerPage({ searchParams }: PageProps<"/ledger">) {
  const { search } = await searchParams;
  return <LedgerView initialSearch={typeof search === "string" ? search : undefined} />;
}
