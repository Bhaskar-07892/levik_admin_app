import type { Metadata } from "next";
import { ProductsView } from "@/components/products/products-view";

export const metadata: Metadata = { title: "Product Catalogue" };

export default async function ProductsPage(props: PageProps<"/products">) {
  const searchParams = await props.searchParams;
  return <ProductsView openNew={searchParams.new === "1"} />;
}
