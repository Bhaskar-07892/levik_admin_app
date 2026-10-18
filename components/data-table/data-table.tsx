"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Client-side sort (local data). */
  sortValue?: (row: T) => string | number;
  /** Server-side sort: the column can be sorted by the API (use with `serverSort`). */
  sortable?: boolean;
  className?: string;
  align?: "left" | "right";
}

export interface ServerPagination {
  /** 1-based page from the API. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface SortState {
  id: string;
  desc: boolean;
}

/**
 * Table with two modes:
 * - local: pass `data` and it sorts and paginates in the browser (small embedded lists);
 * - server: also pass `pagination` (and optionally `serverSort`), and `data` is the current API page.
 */
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
  pagination,
  serverSort,
  loading = false,
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
  pagination?: ServerPagination;
  serverSort?: { value?: SortState; onChange: (sort: SortState) => void };
  loading?: boolean;
}) {
  const router = useRouter();
  const [localSort, setLocalSort] = useState(initialSort);
  const [localPage, setLocalPage] = useState(0);
  const server = Boolean(pagination);
  const sort = serverSort ? serverSort.value : localSort;
  const isSortable = (column: Column<T>) => (serverSort ? Boolean(column.sortable) : Boolean(column.sortValue));
  const toggleSort = (column: Column<T>) => {
    const next = sort?.id === column.id ? { id: column.id, desc: !sort.desc } : { id: column.id, desc: false };
    if (serverSort) serverSort.onChange(next);
    else setLocalSort(next);
    if (pagination) pagination.onPageChange(1);
    else setLocalPage(0);
  };

  const sorted = useMemo(() => {
    if (server || serverSort) return data;
    const column = columns.find((c) => c.id === sort?.id);
    if (!column?.sortValue || !sort) return data;
    const getter = column.sortValue;
    return [...data].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.desc ? -cmp : cmp;
    });
  }, [data, columns, sort, server, serverSort]);

  const effectivePageSize = pagination?.pageSize ?? pageSize;
  const total = pagination?.total ?? sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / effectivePageSize));
  const currentPage = Math.min(pagination ? pagination.page - 1 : localPage, pageCount - 1);
  const setPage = (index: number) => (pagination ? pagination.onPageChange(index + 1) : setLocalPage(index));
  const rows = server ? sorted : sorted.slice(currentPage * effectivePageSize, currentPage * effectivePageSize + effectivePageSize);

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
                    {isSortable(column) ? (
                      <button
                        type="button"
                        className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", column.align === "right" && "flex-row-reverse")}
                        onClick={() => toggleSort(column)}
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
          <TableBody aria-busy={loading || undefined}>
            {loading && rows.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.id} className="py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  className={cn(interactive && "cursor-pointer focus-visible:bg-muted/70 focus-visible:outline-none", loading && "opacity-60")}
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
      <PaginationBar
        page={currentPage + 1}
        pageSize={effectivePageSize}
        total={total}
        onPageChange={(next) => setPage(next - 1)}
        loading={loading && rows.length === 0}
      />
    </div>
  );
}

/** Footer with "Showing x–y of n" and previous/next buttons (1-based page). */
export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  loading = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize)
    return (
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {loading ? "Loading…" : `${total} ${total === 1 ? "record" : "records"}`}
      </div>
    );
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <span>
        Showing {(page - 1) * pageSize + 1}–{Math.min(total, page * pageSize)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {pageCount}
        </span>
        <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
