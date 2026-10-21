"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { ProductImageField } from "@/components/products/product-image-field";
import { SimpleSelect, toOptions } from "@/components/forms/simple-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, call } from "@/lib/api/client";
import type { ProductDto } from "@/lib/api/types";
import { runAction } from "@/lib/utils/run-action";
import { productFormSchema, type ProductFormValues, type ProductInput } from "@/lib/validations";
import { PRODUCT_CATEGORIES } from "@/types";

const EMPTY: ProductFormValues = {
  name: "",
  modelCode: "",
  category: "One-Piece Western WC",
  description: "",
  dimensions: "",
  featuresText: "",
  sku: "",
  barcode: "",
  mrp: 0,
  plumberPoints: 0,
  isActive: true,
  rewardEligible: true,
  image: { kind: "unchanged" },
};

const toValues = (p?: ProductDto): ProductFormValues =>
  p
    ? {
        name: p.name,
        modelCode: p.modelCode,
        category: p.category,
        description: p.description,
        dimensions: p.dimensions ?? "",
        featuresText: p.features.join(", "),
        sku: p.sku,
        barcode: p.barcode,
        mrp: p.mrp,
        plumberPoints: p.plumberPoints,
        isActive: p.isActive,
        rewardEligible: p.rewardEligible,
        image: { kind: "unchanged" },
      }
    : EMPTY;

export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  onCreated,
}: {
  product?: ProductDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (product: ProductDto) => void;
}) {
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: toValues(product) });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(toValues(product));
  }, [open, product, form]);

  const submit = form.handleSubmit(async ({ featuresText, image, ...values }) => {
    const input: ProductInput = {
      ...values,
      dimensions: values.dimensions?.trim() || undefined,
      features: (featuresText ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      // Only send the image when it changed; on update, null clears it.
      ...(image.kind === "uploaded" ? { imageUrl: image.key } : image.kind === "removed" && product ? { imageUrl: null } : {}),
    };
    if (product) {
      const result = await runAction(
        () => call(api.PATCH("/api/v1/admin/products/{id}", { params: { path: { id: product.id } }, body: { ...input, dimensions: input.dimensions ?? "" } })),
        "Product updated",
      );
      if (result.ok) onOpenChange(false);
    } else {
      const created = await runAction(() => call(api.POST("/api/v1/admin/products", { body: input })), (p) => `${p.name} added to the catalogue`);
      if (created.ok) {
        onOpenChange(false);
        onCreated?.(created.value);
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Only enter dimensions and features published in the Levik catalogue. Scan points apply to scans approved after the change.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="image"
              render={({ field }) => <ProductImageField current={product?.imageUrl} value={field.value} onChange={field.onChange} />}
            />
            <Field label="Product name" htmlFor="pf-name" error={errors.name?.message}>
              <Input id="pf-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            </Field>
            <Field label="Model code" htmlFor="pf-code" error={errors.modelCode?.message}>
              <Input id="pf-code" aria-invalid={Boolean(errors.modelCode)} {...form.register("modelCode")} />
            </Field>
            <Field label="Category" htmlFor="pf-category" error={errors.category?.message}>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <SimpleSelect id="pf-category" value={field.value} onValueChange={field.onChange} options={toOptions(PRODUCT_CATEGORIES)} invalid={Boolean(errors.category)} />
                )}
              />
            </Field>
            <Field label="Dimensions (if known)" htmlFor="pf-dim" hint="e.g. 660 x 360 x 735 mm" error={errors.dimensions?.message}>
              <Input id="pf-dim" {...form.register("dimensions")} />
            </Field>
            <Field label="Description" htmlFor="pf-desc" error={errors.description?.message} className="sm:col-span-2">
              <Textarea id="pf-desc" rows={2} aria-invalid={Boolean(errors.description)} {...form.register("description")} />
            </Field>
            <Field label="Features (comma separated)" htmlFor="pf-feat" hint='e.g. S-Trap | P-Trap (9"), Syphonic 5D' className="sm:col-span-2">
              <Input id="pf-feat" {...form.register("featuresText")} />
            </Field>
            <Field label="SKU" htmlFor="pf-sku" error={errors.sku?.message}>
              <Input id="pf-sku" className="font-mono" aria-invalid={Boolean(errors.sku)} {...form.register("sku")} />
            </Field>
            <Field label="Barcode reference" htmlFor="pf-barcode" error={errors.barcode?.message}>
              <Input id="pf-barcode" inputMode="numeric" className="font-mono" aria-invalid={Boolean(errors.barcode)} {...form.register("barcode")} />
            </Field>
            <Field label="Demo MRP (₹)" htmlFor="pf-mrp" error={errors.mrp?.message}>
              <Input id="pf-mrp" type="number" min={0} aria-invalid={Boolean(errors.mrp)} {...form.register("mrp", { valueAsNumber: true })} />
            </Field>
            <Field label="Plumber points per approved scan" htmlFor="pf-points" error={errors.plumberPoints?.message}>
              <Input id="pf-points" type="number" min={0} aria-invalid={Boolean(errors.plumberPoints)} {...form.register("plumberPoints", { valueAsNumber: true })} />
            </Field>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <span>
                    <span className="block font-medium">Active</span>
                    <span className="block text-xs text-muted-foreground">Visible to plumbers and retailers</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
            <Controller
              control={form.control}
              name="rewardEligible"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <span>
                    <span className="block font-medium">Reward eligible</span>
                    <span className="block text-xs text-muted-foreground">Earns scan points and invoice incentives</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{product ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
