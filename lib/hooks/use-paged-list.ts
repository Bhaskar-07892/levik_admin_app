"use client";

import { useState } from "react";
import type { SortState } from "@/components/data-table/data-table";
import { useDebouncedValue } from "./use-debounced-value";

const ALL = "all";

/**
 * State for a server-paginated list page: page, debounced search, select filters ("all" = no filter)
 * and optional sort. Changing search, a filter or the sort goes back to page 1. `query` is ready to pass
 * as API query params.
 */
export function usePagedList<F extends Record<string, string>>(initialFilters: F, options: { pageSize?: number; sort?: SortState; initialSearch?: string } = {}) {
  const pageSize = options.pageSize ?? 20;
  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState(options.initialSearch ?? "");
  const [filters, setFilters] = useState<F>(initialFilters);
  const [sort, setSortState] = useState<SortState | undefined>(options.sort);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [lastSearch, setLastSearch] = useState(debouncedSearch);

  // Reset to page 1 when the debounced search term changes (adjusting state during render, not in an effect).
  if (lastSearch !== debouncedSearch) {
    setLastSearch(debouncedSearch);
    setPage(1);
  }

  const setFilter = <K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== ALL)) as Partial<F>;
  const filterQuery = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...activeFilters,
  };

  return {
    page,
    setPage,
    pageSize,
    search,
    setSearch: setSearchState,
    filters,
    setFilter,
    sort,
    setSort: (next: SortState) => {
      setSortState(next);
      setPage(1);
    },
    /** Search + filters only, for totals and exports that cover every matching row. */
    filterQuery,
    query: {
      page,
      pageSize,
      ...filterQuery,
      ...(sort ? { sort: sort.id, order: sort.desc ? ("desc" as const) : ("asc" as const) } : {}),
    },
  };
}
