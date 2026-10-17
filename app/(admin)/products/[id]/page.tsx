import type { Metadata } from "next";
import { ProductDetail } from "@/components/products/product-detail";

export const metadata: Metadata = { title: "Product details" };

export default async function ProductDetailPage(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  return <ProductDetail id={id} />;
}
