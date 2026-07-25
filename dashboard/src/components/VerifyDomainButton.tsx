"use client";

import { useState, useTransition } from "react";
import { verifyDomain } from "@/actions/domains";
import type { DnsCheckResult } from "@/lib/verifyDns";

export function VerifyDomainButton({ domain }: { domain: string }) {
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<DnsCheckResult[] | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const outcome = await verifyDomain(domain);
            setResults(outcome.results);
          })
        }
        className="w-fit rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition hover:bg-surface-hover disabled:opacity-60"
      >
        {pending ? "Checking…" : "Verify DNS"}
      </button>

      {results && (
        <ul className="flex flex-col gap-1 text-sm">
          {results.map((r) => (
            <li
              key={r.label}
              className={r.pass ? "text-success" : "text-danger"}
            >
              {r.pass ? "✓" : "✗"} {r.label}: {r.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
