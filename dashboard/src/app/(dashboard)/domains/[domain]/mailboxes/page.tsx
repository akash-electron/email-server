import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { DomainModel } from "@/models/Domain";
import { MailboxModel } from "@/models/Mailbox";
import { requireUser } from "@/lib/auth";
import { AddMailboxForm } from "@/components/AddMailboxForm";
import { DeleteMailboxButton } from "@/components/DeleteMailboxButton";

export default async function MailboxesPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const session = await requireUser();
  await connectDb();

  const owned = await DomainModel.exists({ userId: session.userId, domain });
  if (!owned) {
    notFound();
  }

  const mailboxes = await MailboxModel.find({ userId: session.userId, domain })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/domains" className="text-sm text-accent hover:text-accent-hover">
          ← All domains
        </Link>
        <h1 className="mt-2 mb-4 text-lg font-semibold text-foreground">
          Mailboxes for {domain}
        </h1>
        <AddMailboxForm domain={domain} />
      </div>

      <div className="flex flex-col gap-2">
        {mailboxes.length === 0 && (
          <p className="text-sm text-foreground-muted">No mailboxes yet.</p>
        )}
        {mailboxes.map((m) => (
          <div
            key={String(m._id)}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="text-foreground">
              {m.localPart}@{m.domain}
            </span>
            <DeleteMailboxButton domain={domain} localPart={m.localPart} />
          </div>
        ))}
      </div>
    </div>
  );
}
