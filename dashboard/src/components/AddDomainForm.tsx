"use client";

import { useActionState } from "react";
import { addDomain } from "@/actions/domains";

export function AddDomainForm() {
  const [state, formAction, pending] = useActionState(addDomain, null);

  return (
    <form action={formAction} className="flex items-start gap-3">
      <div className="flex-1">
        <input
          name="domain"
          placeholder="example.com"
          required
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none transition focus:border-accent"
        />
        {state?.error && <p className="mt-1.5 text-sm text-danger">{state.error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add domain"}
      </button>
    </form>
  );
}
