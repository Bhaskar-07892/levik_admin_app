"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStorageWarning, useDatabaseSnapshot } from "@/lib/mock-api/store";
import { useSession } from "@/lib/storage/session";
import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen" aria-busy="true" aria-label="Loading admin portal">
      <div className="hidden w-64 bg-sidebar lg:block" />
      <div className="flex-1 space-y-6 p-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

/** Client shell: demo session guard, database gate, sidebar and top bar. */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const db = useDatabaseSnapshot();

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  if (!session || !db) return <ShellSkeleton />;

  const warning = getStorageWarning();

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <AppSidebar />
      </aside>
      <div className="lg:pl-64">
        <Topbar />
        <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {warning ? (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{warning}</span>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
