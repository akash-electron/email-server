import Link from "next/link";
import { connectDb } from "@/lib/db";
import { DomainModel } from "@/models/Domain";
import { requireUser } from "@/lib/auth";
import { AddDomainForm } from "@/components/AddDomainForm";
import { VerifyDomainButton } from "@/components/VerifyDomainButton";
import { DnsRecordsPanel } from "@/components/DnsRecordsPanel";

export default async function DomainsPage() {
  const session = await requireUser();
  await connectDb();

  const domains = await DomainModel.find({ userId: session.userId }).sort({ createdAt: -1 }).lean();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-foreground">Your domains</h1>
        <AddDomainForm />
      </div>

      <div className="flex flex-col gap-4">
        {domains.length === 0 && (
          <p className="text-sm text-foreground-muted">No domains added yet.</p>
        )}

        {domains.map((d) => (
          <div key={String(d._id)} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-medium text-foreground">{d.domain}</h2>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-medium " +
                    (d.dnsVerified
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning")
                  }
                >
                  {d.dnsVerified ? "DNS verified" : "DNS pending"}
                </span>
              </div>
              <Link
                href={`/domains/${d.domain}/mailboxes`}
                className="text-sm text-accent hover:text-accent-hover"
              >
                Manage mailboxes →
              </Link>
            </div>

            <DnsRecordsPanel domain={d.domain} />

            <div className="mt-3">
              <VerifyDomainButton domain={d.domain} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
