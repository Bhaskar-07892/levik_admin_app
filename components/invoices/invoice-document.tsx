import { invoiceTotals } from "@/lib/mock-api/rules";
import { formatDate, formatINR } from "@/lib/utils/format";
import type { Database, Invoice } from "@/types";

/** Sample invoice preview rendered from seeded line items. Not a real tax document. */
export function InvoiceDocument({ db, invoice }: { db: Database; invoice: Invoice }) {
  const retailer = db.retailers.find((r) => r.id === invoice.retailerId);
  const totals = invoiceTotals(invoice);
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-white p-6 font-mono text-[11px] text-slate-700 shadow-inner">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="-rotate-12 text-5xl font-bold tracking-widest text-slate-200/70 uppercase">Demo copy</span>
      </div>
      <div className="relative">
        <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{retailer?.shopName}</p>
            <p>{retailer?.address}</p>
            <p>
              {retailer?.city}, {retailer?.state}
            </p>
            <p>GSTIN: {retailer?.gstin ?? "Unregistered"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">TAX INVOICE</p>
            <p>No: {invoice.invoiceNumber}</p>
            <p>Date: {formatDate(invoice.invoiceDate)}</p>
          </div>
        </div>
        <p className="mt-3">Bill to: {invoice.buyerName}</p>
        <table className="mt-3 w-full">
          <thead>
            <tr className="border-y border-slate-300 text-left">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((line) => {
              const product = db.products.find((p) => p.id === line.productId);
              return (
                <tr key={line.id}>
                  <td className="py-1">
                    {product?.sku} {product?.name}
                  </td>
                  <td className="py-1 text-right">{line.quantity}</td>
                  <td className="py-1 text-right">{formatINR(line.unitPrice)}</td>
                  <td className="py-1 text-right">{formatINR(line.quantity * line.unitPrice)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 ml-auto w-56 space-y-0.5 border-t border-slate-300 pt-2">
          <p className="flex justify-between">
            <span>Taxable value</span>
            <span>{formatINR(totals.subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>GST @ 18%</span>
            <span>{formatINR(totals.gst)}</span>
          </p>
          <p className="flex justify-between font-bold text-slate-900">
            <span>Total</span>
            <span>{formatINR(totals.total)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
