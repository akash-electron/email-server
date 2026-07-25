"use server";

import { revalidatePath } from "next/cache";
import { connectDb } from "@/lib/db";
import { DomainModel } from "@/models/Domain";
import { MailboxModel } from "@/models/Mailbox";
import { requireUser } from "@/lib/auth";
import { mailcowAddMailbox, mailcowDeleteMailbox } from "@/lib/mailcow";

export type AddMailboxState = { error: string } | null;

async function assertDomainOwnership(userId: string, domain: string) {
  const owned = await DomainModel.exists({ userId, domain });
  if (!owned) {
    throw new Error("Domain not found or not owned by the current user.");
  }
}

export async function addMailbox(
  domain: string,
  _prevState: AddMailboxState,
  formData: FormData
): Promise<AddMailboxState> {
  const session = await requireUser();
  await connectDb();
  await assertDomainOwnership(session.userId, domain);

  const localPart = String(formData.get("localPart") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? localPart);

  if (!/^[a-z0-9._-]+$/.test(localPart)) {
    return { error: "Mailbox name can only contain letters, numbers, dots, hyphens, underscores." };
  }
  if (password.length < 12) {
    return { error: "Password must be at least 12 characters." };
  }

  const existing = await MailboxModel.findOne({ domain, localPart });
  if (existing) {
    return { error: `${localPart}@${domain} already exists.` };
  }

  try {
    await mailcowAddMailbox({ localPart, domain, name, password });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create mailbox in Mailcow." };
  }

  await MailboxModel.create({ userId: session.userId, domain, localPart });

  revalidatePath(`/domains/${domain}/mailboxes`);
  return null;
}

export async function deleteMailbox(domain: string, localPart: string) {
  const session = await requireUser();
  await connectDb();
  await assertDomainOwnership(session.userId, domain);

  await mailcowDeleteMailbox(`${localPart}@${domain}`);
  await MailboxModel.deleteOne({ userId: session.userId, domain, localPart });

  revalidatePath(`/domains/${domain}/mailboxes`);
}
