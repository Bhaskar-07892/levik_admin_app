"use client";

import { FileDown, FileSpreadsheet, QrCode } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Field } from "@/components/forms/field";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { $api, api, call, downloadFile } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { LabelBatch, ProductDto } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { runAction } from "@/lib/utils/run-action";
import { toast } from "sonner";

/** The API renders at most this many labels per PDF request (A4 sheets of 24). */
const PDF_CHUNK = 2400;
const MAX_BATCH = 10_000;

async function download(path: string, query: Record<string, number>, name: string) {
  try {
    await downloadFile(path, query, name);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

/** Unique, signed QR labels for one product: generate batches and download print-ready sheets. */
export function LabelBatches({ product }: { product: ProductDto }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = $api.useQuery("get", "/api/v1/admin/label-batches", { params: { query: { productId: product.id, page, pageSize: 5 } } });

  const columns: Column<LabelBatch>[] = [
    { id: "id", header: "Batch", cell: (b) => <span className="font-mono text-xs">{b.id}</span> },
    { id: "created", header: "Generated", cell: (b) => <span className="whitespace-nowrap">{formatDateTime(b.createdAt)}</span> },
    { id: "note", header: "Note", cell: (b) => b.note ?? <span className="text-muted-foreground">—</span> },
    { id: "quantity", header: "Labels", align: "right", cell: (b) => formatNumber(b.quantity) },
    {
      id: "usage",
      header: "Available / claimed / void",
      align: "right",
      cell: (b) => (
        <span className="tabular-nums">
          {formatNumber(b.available)} / {formatNumber(b.claimed)} / {formatNumber(b.voided)}
        </span>
      ),
    },
    {
      id: "files",
      header: "Print files",
      cell: (b) => (
        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          {Array.from({ length: Math.ceil(b.quantity / PDF_CHUNK) }).map((_, i) => {
            const from = i * PDF_CHUNK;
            const to = Math.min(b.quantity, from + PDF_CHUNK);
            return (
              <Button
                key={i}
                variant="outline"
                size="xs"
                onClick={() => download(`/api/v1/admin/label-batches/${b.id}/labels.pdf`, { offset: from, limit: to - from }, `${b.id}-labels-${from + 1}-${to}.pdf`)}
              >
                <FileDown /> PDF{b.quantity > PDF_CHUNK ? ` ${from + 1}–${to}` : ""}
              </Button>
            );
          })}
          <Button variant="outline" size="xs" onClick={() => download(`/api/v1/admin/label-batches/${b.id}/labels.csv`, {}, `${b.id}-labels.csv`)}>
            <FileSpreadsheet /> CSV
          </Button>
        </div>
      ),
    },
  ];

  return (
    <SectionCard
      title="QR labels"
      description="Each physical unit gets its own signed QR label. A label can be credited only once; counterfeit or reused codes are rejected at scan time."
      bodyClassName="p-0"
      actions={
        <Button size="sm" onClick={() => setOpen(true)} disabled={!product.isActive}>
          <QrCode /> Generate labels
        </Button>
      }
    >
      <DataTable
        caption={`QR label batches for ${product.name}`}
        data={data?.items ?? []}
        columns={columns}
        getRowId={(b) => b.id}
        loading={isLoading}
        pagination={{ page, pageSize: 5, total: data?.total ?? 0, onPageChange: setPage }}
        emptyTitle="No labels generated yet"
        emptyDescription="Generate a batch to print unique QR labels for this model."
      />
      <GenerateDialog product={product} open={open} onOpenChange={setOpen} />
    </SectionCard>
  );
}

function GenerateDialog({ product, open, onOpenChange }: { product: ProductDto; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [quantity, setQuantity] = useState("100");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(quantity);
    if (!Number.isInteger(value) || value < 1 || value > MAX_BATCH) {
      setError(`Enter a whole number between 1 and ${formatNumber(MAX_BATCH)}.`);
      return;
    }
    setError(undefined);
    setSubmitting(true);
    const result = await runAction(
      () =>
        call(
          api.POST("/api/v1/admin/products/{productId}/label-batches", {
            params: { path: { productId: product.id } },
            body: { quantity: value, note: note.trim() || undefined },
          }),
        ),
      (batch) => `Batch ${batch.id}: ${formatNumber(batch.quantity)} labels generated`,
    );
    setSubmitting(false);
    if (result.ok) {
      onOpenChange(false);
      setNote("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Generate QR labels</DialogTitle>
            <DialogDescription>
              Creates one unique serial per unit of {product.name} (model {product.modelCode}). Print the PDF on A4 label sheets (3 × 8) or send the CSV to your label
              printer.
            </DialogDescription>
          </DialogHeader>
          <Field label="Number of labels" htmlFor="lb-qty" error={error}>
            <Input id="lb-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-invalid={Boolean(error)} />
          </Field>
          <Field label="Note (optional)" htmlFor="lb-note">
            <Input id="lb-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Production run Oct 2026, Jaipur plant" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
