"use client";

import { useActionState } from "react";
import { addMailbox } from "@/actions/mailboxes";

export function AddMailboxForm({ domain }: { domain: string }) {
  const [state, formAction, pending] = useActionState(addMailbox.bind(null, domain), null);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-3">
      <div className="flex items-center gap-1.5">
        <input
          name="localPart"
          placeholder="admin"
          required
          className="w-40 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none transition focus:border-accent"
        />
        <span className="text-foreground-muted">@{domain}</span>
      </div>
      <input
        name="password"
        type="password"
        placeholder="Password (12+ chars)"
        required
        minLength={12}
        className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none transition focus:border-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add mailbox"}
      </button>
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
