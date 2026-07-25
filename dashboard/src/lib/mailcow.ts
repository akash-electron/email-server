import "server-only";

const MAILCOW_API_HOST = process.env.MAILCOW_API_HOST;
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY;

if (!MAILCOW_API_HOST || !MAILCOW_API_KEY) {
  throw new Error("MAILCOW_API_HOST / MAILCOW_API_KEY environment variables are not set");
}

type MailcowLogEntry = { type: "success" | "error"; msg?: unknown[]; log?: unknown[] };

async function mailcowRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${MAILCOW_API_HOST}/api/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      "X-API-Key": MAILCOW_API_KEY!,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Mailcow API ${path} failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

function assertSuccess(entries: MailcowLogEntry[], context: string) {
  const failed = entries.find((entry) => entry.type === "error");
  if (failed) {
    throw new Error(`Mailcow API error during ${context}: ${JSON.stringify(failed.msg ?? failed)}`);
  }
}

export async function mailcowAddDomain(domain: string, description: string) {
  const result = await mailcowRequest<MailcowLogEntry[]>("add/domain", {
    method: "POST",
    body: {
      domain,
      description,
      aliases: "400",
      mailboxes: "10",
      defquota: "3072",
      maxquota: "10240",
      quota: "10240",
      active: "1",
      rl_value: "",
      rl_frame: "s",
      backupmx: "0",
      relay_all_recipients: "0",
      relay_unknown_only: "0",
    },
  });
  assertSuccess(result, `add/domain (${domain})`);
  return result;
}

export type DkimRecord = {
  dkim_txt: string;
  dkim_selector: string;
  length: string;
};

export async function mailcowGetDkim(domain: string): Promise<DkimRecord> {
  return mailcowRequest<DkimRecord>(`get/dkim/${domain}`);
}

export async function mailcowAddMailbox(params: {
  localPart: string;
  domain: string;
  name: string;
  password: string;
}) {
  const result = await mailcowRequest<MailcowLogEntry[]>("add/mailbox", {
    method: "POST",
    body: {
      local_part: params.localPart,
      domain: params.domain,
      name: params.name,
      quota: "3072",
      password: params.password,
      password2: params.password,
      active: "1",
    },
  });
  assertSuccess(result, `add/mailbox (${params.localPart}@${params.domain})`);
  return result;
}

// NOTE: unlike add/domain, get/dkim, and add/mailbox above (all hand-verified
// against the live server, see FLOW.md), this endpoint follows Mailcow's
// documented convention but hasn't been tested against the real server yet.
export async function mailcowDeleteMailbox(email: string) {
  const result = await mailcowRequest<MailcowLogEntry[]>("delete/mailbox", {
    method: "POST",
    body: [email],
  });
  assertSuccess(result, `delete/mailbox (${email})`);
  return result;
}
