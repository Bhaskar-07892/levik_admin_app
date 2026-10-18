"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, useSession } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/errors";
import { loginSchema, type LoginValues } from "@/lib/validations";

/** Seeded local/demo admin. Shown only outside production builds. */
const DEMO_CREDENTIALS = { email: "admin@levik.demo", password: "LevikDemo@123" } as const;
const SHOW_DEMO_HINT = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false";

export function LoginForm() {
  const router = useRouter();
  const session = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    if (session.status === "authenticated") router.replace("/dashboard");
  }, [session.status, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(values.email.trim(), values.password);
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  });

  return (
    <>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate>
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="username" className="h-10" aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="h-10 pr-10"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="h-10" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>
      {SHOW_DEMO_HINT ? (
      <div className="mt-6 rounded-lg border border-[#e7dcc6] bg-gold-soft p-4 text-sm text-[#6b5326]">
        <p className="flex items-center gap-1.5 font-medium">
          <Info className="size-4" /> Demo account
        </p>
        <p className="mt-1 text-xs">Seeded admin for local and demo environments. Hide with NEXT_PUBLIC_SHOW_DEMO_LOGIN=false.</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="font-medium">Email</dt>
          <dd className="font-mono">{DEMO_CREDENTIALS.email}</dd>
          <dt className="font-medium">Password</dt>
          <dd className="font-mono">{DEMO_CREDENTIALS.password}</dd>
        </dl>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 border-[#d9c7a3] bg-white/70"
          onClick={() => {
            form.setValue("email", DEMO_CREDENTIALS.email, { shouldValidate: true });
            form.setValue("password", DEMO_CREDENTIALS.password, { shouldValidate: true });
          }}
        >
          Fill demo credentials
        </Button>
      </div>
      ) : null}
    </>
  );
}
