import "server-only";
import { resolveMx, resolveTxt } from "node:dns/promises";
import { mailcowGetDkim } from "./mailcow";

export type DnsCheckResult = {
  label: "MX" | "SPF" | "DMARC" | "DKIM";
  pass: boolean;
  detail: string;
};

async function safeResolveTxt(hostname: string): Promise<string[]> {
  try {
    // node's TXT records come back as string[][] (chunks per record); flatten each record to one string.
    const records = await resolveTxt(hostname);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

async function checkMx(domain: string, expectedMxHost: string): Promise<DnsCheckResult> {
  try {
    const records = await resolveMx(domain);
    const hosts = records.map((r) => r.exchange);
    const matched = hosts.some((h) => h.toLowerCase().includes(expectedMxHost.toLowerCase()));
    return {
      label: "MX",
      pass: matched,
      detail: matched
        ? hosts.join(", ")
        : `expected host containing '${expectedMxHost}', got: ${hosts.join(", ") || "<empty>"}`,
    };
  } catch {
    return { label: "MX", pass: false, detail: `no MX record found for ${domain}` };
  }
}

async function checkSpf(domain: string): Promise<DnsCheckResult> {
  const txts = await safeResolveTxt(domain);
  const spfRecords = txts.filter((t) => t.startsWith("v=spf1"));

  if (spfRecords.length === 0) {
    return { label: "SPF", pass: false, detail: `no v=spf1 TXT record found on ${domain}` };
  }
  // Multiple SPF records on the same domain is invalid per RFC and breaks SPF
  // entirely (real bug hit with vasomanix.com's leftover registrar record) —
  // the shell script didn't catch this; the dashboard check does.
  if (spfRecords.length > 1) {
    return {
      label: "SPF",
      pass: false,
      detail: `${spfRecords.length} v=spf1 records found (must be exactly 1): ${spfRecords.join(" | ")}`,
    };
  }
  return { label: "SPF", pass: true, detail: spfRecords[0] };
}

async function checkDmarc(domain: string): Promise<DnsCheckResult> {
  const txts = await safeResolveTxt(`_dmarc.${domain}`);
  const dmarcRecord = txts.find((t) => t.startsWith("v=DMARC1"));
  return dmarcRecord
    ? { label: "DMARC", pass: true, detail: dmarcRecord }
    : { label: "DMARC", pass: false, detail: `no v=DMARC1 TXT record found on _dmarc.${domain}` };
}

async function checkDkim(domain: string): Promise<DnsCheckResult> {
  let selector: string;
  try {
    const dkim = await mailcowGetDkim(domain);
    selector = dkim.dkim_selector;
    if (!selector) throw new Error("empty selector");
  } catch {
    return {
      label: "DKIM",
      pass: false,
      detail: `could not fetch expected DKIM selector from Mailcow API for ${domain}`,
    };
  }

  const txts = await safeResolveTxt(`${selector}._domainkey.${domain}`);
  return txts.length > 0
    ? { label: "DKIM", pass: true, detail: `selector '${selector}' published` }
    : { label: "DKIM", pass: false, detail: `no TXT record found at ${selector}._domainkey.${domain}` };
}

export async function verifyDomainDns(
  domain: string,
  expectedMxHost: string
): Promise<{ results: DnsCheckResult[]; allPass: boolean }> {
  const results = await Promise.all([
    checkMx(domain, expectedMxHost),
    checkSpf(domain),
    checkDmarc(domain),
    checkDkim(domain),
  ]);

  return { results, allPass: results.every((r) => r.pass) };
}
