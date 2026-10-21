"use client";

import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 10; // matches the API's default UPLOAD_MAX_MB

/** What the form should send for the image when it is saved. */
export type ImageChange = { kind: "unchanged" } | { kind: "uploaded"; key: string; url: string } | { kind: "removed" };

/**
 * Picks a product photo and uploads it right away (POST /uploads, purpose product-image), so the form only
 * submits the returned key. `current` is the product's existing imageUrl, shown until it is replaced or removed.
 */
export function ProductImageField({ current, value, onChange }: { current?: string; value: ImageChange; onChange: (change: ImageChange) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = value.kind === "uploaded" ? value.url : value.kind === "removed" ? undefined : current;

  const pick = async (file?: File) => {
    if (!file) return;
    setError(null);
    if (!ACCEPTED.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The image is larger than ${MAX_MB} MB.`);
    setBusy(true);
    try {
      const uploaded = await uploadFile(file, "product-image");
      onChange({ kind: "uploaded", key: uploaded.key, url: uploaded.url });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-3 sm:col-span-2">
      <ProductThumb src={shown} alt="Product image" className="size-24 shrink-0" sizes="96px" />
      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-sm font-medium">Product image</p>
          <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to {MAX_MB} MB. A square photo on a plain background looks best in the app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
            {busy ? "Uploading…" : shown ? "Replace image" : "Upload image"}
          </Button>
          {shown && !busy ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ kind: "removed" })}>
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        aria-label="Choose product image"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}
