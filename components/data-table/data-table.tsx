"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right";
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  rowHref,
  onRowClick,
  pageSize = 10,
  initialSort,
  emptyTitle = "No records match your filters",
  emptyDescription = "Try clearing the search or changing a filter.",
  caption,
}: {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  initialSort?: { id: string; desc: boolean };
  emptyTitle?: string;
  emptyDescription?: string;
  caption: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.id === sort?.id);
    if (!column?.sortValue || !sort) return data;
    const getter = column.sortValue;
    return [...data].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.desc ? -cmp : cmp;
    });
  }, [data, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const activate = (row: T) => {
    if (onRowClick) onRowClick(row);
    else if (rowHref) router.push(rowHref(row));
  };
  const interactive = Boolean(onRowClick || rowHref);

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              {columns.map((column) => {
                const active = sort?.id === column.id;
                return (
                  <TableHead
                    key={column.id}
                    className={cn("h-10 text-xs font-semibold tracking-wide text-muted-foreground uppercase", column.align === "right" && "text-right", column.className)}
                    aria-sort={active ? (sort?.desc ? "descending" : "ascending") : undefined}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", column.align === "right" && "flex-row-reverse")}
                        onClick={() => {
                          setSort((prev) => (prev?.id === column.id ? { id: column.id, desc: !prev.desc } : { id: column.id, desc: false }));
                          setPage(0);
                        }}
                      >
                        {column.header}
                        {active ? (sort?.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  className={cn(interactive && "cursor-pointer focus-visible:bg-muted/70 focus-visible:outline-none")}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => activate(row) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === "Enter" && event.target === event.currentTarget) activate(row);
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <TableCell key={column.id} className={cn("py-3", column.align === "right" && "text-right tabular-nums", column.className)}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {sorted.length > pageSize ? (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {currentPage * pageSize + 1}–{Math.min(sorted.length, (currentPage + 1) * pageSize)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {currentPage + 1} / {pageCount}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "record" : "records"}
        </div>
      )}
    </div>
  );
}
