"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/actions/auth";

type AuthFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
};

export function AuthForm({ action, submitLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none transition focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none transition focus:border-accent"
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
