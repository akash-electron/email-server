"use server";

import { revalidatePath } from "next/cache";
import { connectDb } from "@/lib/db";
import { DomainModel } from "@/models/Domain";
import { requireUser } from "@/lib/auth";
import { mailcowAddDomain, mailcowGetDkim } from "@/lib/mailcow";
import { verifyDomainDns, type DnsCheckResult } from "@/lib/verifyDns";

const MAILCOW_HOSTNAME = process.env.MAILCOW_HOSTNAME;
if (!MAILCOW_HOSTNAME) {
  throw new Error("MAILCOW_HOSTNAME environment variable is not set");
}

export type AddDomainState = { error: string } | null;

function normalizeDomain(raw: FormDataEntryValue | null): string | null {
  const domain = String(raw ?? "")
    .trim()
    .toLowerCase();
  // Minimal shape check; real validity is proven by the DNS verify step, not this regex.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return null;
  }
  return domain;
}

export async function addDomain(_prevState: AddDomainState, formData: FormData): Promise<AddDomainState> {
  const session = await requireUser();
  const domain = normalizeDomain(formData.get("domain"));

  if (!domain) {
    return { error: "Enter a valid domain, e.g. example.com" };
  }
  if (domain === MAILCOW_HOSTNAME) {
    // Same collision class that broke mail delivery in Phase 0/1 — the mail
    // engine hostname and a customer's mail domain must never be identical.
    return { error: `${domain} can't be used as a mail domain — it's the mail server's own hostname.` };
  }

  await connectDb();

  const existing = await DomainModel.findOne({ domain });
  if (existing) {
    return { error: "This domain has already been added." };
  }

  try {
    await mailcowAddDomain(domain, `Added by ${session.email}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to provision domain in Mailcow." };
  }

  await DomainModel.create({ userId: session.userId, domain, mailcowStatus: "provisioned" });

  revalidatePath("/domains");
  return null;
}

export type DomainDnsRecords = {
  mx: { name: string; value: string };
  spf: { name: string; value: string };
  dkim: { name: string; value: string };
  dmarc: { name: string; value: string };
};

export async function getDomainDnsRecords(domain: string): Promise<DomainDnsRecords> {
  const session = await requireUser();
  await connectDb();

  const owned = await DomainModel.exists({ userId: session.userId, domain });
  if (!owned) {
    throw new Error("Domain not found or not owned by the current user.");
  }

  const dkim = await mailcowGetDkim(domain);

  return {
    mx: { name: domain, value: `${MAILCOW_HOSTNAME} (priority 10)` },
    spf: { name: domain, value: "v=spf1 mx ~all" },
    dkim: { name: `${dkim.dkim_selector}._domainkey.${domain}`, value: dkim.dkim_txt },
    dmarc: { name: `_dmarc.${domain}`, value: `v=DMARC1; p=quarantine; rua=mailto:admin@${domain}` },
  };
}

export async function verifyDomain(domain: string): Promise<{ results: DnsCheckResult[]; allPass: boolean }> {
  const session = await requireUser();
  await connectDb();

  const owned = await DomainModel.findOne({ userId: session.userId, domain });
  if (!owned) {
    throw new Error("Domain not found or not owned by the current user.");
  }

  const outcome = await verifyDomainDns(domain, MAILCOW_HOSTNAME!);

  owned.dnsVerified = outcome.allPass;
  await owned.save();

  revalidatePath("/domains");
  return outcome;
}
