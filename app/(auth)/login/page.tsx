import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/layout/brand-mark";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-brand-deep lg:block">
        <Image src="/brand-cover.jpg" alt="Levik one-piece WC from the Bathware Collection" fill priority sizes="55vw" className="object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-deep via-brand-deep/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="text-xs font-semibold tracking-[0.3em] text-[#e2cc9f] uppercase">Levik Rewards Programme</p>
          <h2 className="mt-3 max-w-md text-3xl leading-tight font-semibold">One control panel for plumbers, retailers, schemes and rewards.</h2>
          <p className="mt-3 max-w-md text-sm text-white/75">
            Verify product scans and invoices, credit points, run schemes and track reward fulfilment.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <BrandMark tone="dark" />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Sign in to Levik Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use your programme administrator account.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
