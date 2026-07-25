"use client";

import { useTransition } from "react";
import { deleteMailbox } from "@/actions/mailboxes";

export function DeleteMailboxButton({ domain, localPart }: { domain: string; localPart: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteMailbox(domain, localPart))}
      className="text-sm text-danger hover:opacity-80 disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
