import { getDomainDnsRecords } from "@/actions/domains";

export async function DnsRecordsPanel({ domain }: { domain: string }) {
  const records = await getDomainDnsRecords(domain);
  const rows = [
    { label: "MX", ...records.mx },
    { label: "SPF (TXT)", ...records.spf },
    { label: "DKIM (TXT)", ...records.dkim },
    { label: "DMARC (TXT)", ...records.dmarc },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground-muted">{row.label}</span>
          <code className="break-all text-foreground">
            {row.name} → {row.value}
          </code>
        </div>
      ))}
    </div>
  );
}
