import type { Metadata } from "next";
import { SchemeEdit } from "@/components/schemes/scheme-edit";

export const metadata: Metadata = { title: "Edit scheme" };

export default async function EditSchemePage(props: PageProps<"/schemes/[id]/edit">) {
  const { id } = await props.params;
  return <SchemeEdit id={id} />;
}
