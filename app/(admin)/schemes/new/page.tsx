import type { Metadata } from "next";
import { SchemeForm } from "@/components/schemes/scheme-form";

export const metadata: Metadata = { title: "New scheme" };

export default function NewSchemePage() {
  return <SchemeForm />;
}
