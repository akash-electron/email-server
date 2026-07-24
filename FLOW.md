# Mail Hosting Product — Flow & API Contract

This is the spec the future customer-facing app (separate repo) builds against. Everything below was
hand-verified against a local Mailcow instance, not assumed from docs — see `server-progress.md` for
the gotchas hit along the way.

## End-to-end customer flow

1. Customer signs up (email + password) — future app, not this repo.
2. Customer adds a domain, e.g. `acme.com`.
3. App calls Mailcow to create the domain, gets back a DKIM key, and shows the customer the DNS
   records to add:
   - **MX** → your mail server hostname (e.g. `mail-engine.yourplatform.com` — kept distinct from
     both the customer's mail domain and your product's own `domain.com`/`api.domain.com`), priority 10
   - **SPF** (TXT on `acme.com`) → `v=spf1 mx ~all`
   - **DKIM** (TXT on `<selector>._domainkey.acme.com`) → from Mailcow's `dkim_txt` response
   - **DMARC** (TXT on `_dmarc.acme.com`) → `v=DMARC1; p=quarantine; rua=mailto:dmarc@acme.com`
4. Customer adds these records at their DNS provider.
5. App verifies the records (`scripts/verify-domain-dns.sh acme.com <your-mail-hostname>`, or the
   same logic as an API endpoint) — domain marked "active" once MX/SPF/DMARC/DKIM all pass.
6. Customer creates mailboxes (e.g. `admin@acme.com`) — app calls Mailcow's `/add/mailbox`.
7. Customer logs into webmail or configures IMAP/SMTP in a real client.

## Mailcow API — verified calls

Base URL: `https://<mailcow-host>/api/v1/`
Auth header: `X-API-Key: <key>`

Generating a key for local dev (no UI automation needed — this is exactly what the app will use):

```sql
INSERT INTO api (api_key, allow_from, skip_ip_check, access)
VALUES ('<random-key>', '0.0.0.0/0', 1, 'rw');
```

In production, generate the key via the Mailcow admin UI (Configuration → Access → API) and restrict
`allow_from` to your app server's IP instead of `0.0.0.0/0`.

### Add domain

```
POST /api/v1/add/domain
Content-Type: application/json

{
  "domain": "acme.com",
  "description": "Acme Inc",
  "aliases": "400",
  "mailboxes": "10",
  "defquota": "3072",
  "maxquota": "10240",
  "quota": "10240",
  "active": "1",
  "rl_value": "",
  "rl_frame": "s",
  "backupmx": "0",
  "relay_all_recipients": "0",
  "relay_unknown_only": "0"
}
```

Response (200): an array of `{"type":"success", ...}` entries — one for the auto-generated DKIM key,
one for the domain itself.

### Get DKIM record (GET only — POST returns 405)

```
GET /api/v1/get/dkim/acme.com
X-API-Key: <key>
```

Response:
```json
{
  "pubkey": "...",
  "length": "2048",
  "dkim_txt": "v=DKIM1;k=rsa;t=s;s=email;p=...",
  "dkim_selector": "dkim",
  "privkey": ""
}
```

Show the customer: publish `dkim_txt` as a TXT record at `<dkim_selector>._domainkey.<domain>`.

### Add mailbox

```
POST /api/v1/add/mailbox
Content-Type: application/json

{
  "local_part": "admin",
  "domain": "acme.com",
  "name": "Admin",
  "quota": "3072",
  "password": "...",
  "password2": "...",
  "active": "1"
}
```

### Edit mailbox (e.g. reset password)

```
POST /api/v1/edit/mailbox
Content-Type: application/json

{
  "items": ["admin@acme.com"],
  "attr": { "password": "...", "password2": "..." }
}
```

## DNS verification

`scripts/verify-domain-dns.sh <domain> <expected-mx-host>` checks MX, SPF, DMARC via `dig`, and DKIM
by comparing against what Mailcow's API says it should be. Exit code 0 = all pass. This is the exact
logic the dashboard's "verify domain" button should run (as an API endpoint instead of a shell script).

```
MAILCOW_API_KEY=<key> MAILCOW_API_HOST=https://mail-engine.yourplatform.com \
  ./scripts/verify-domain-dns.sh acme.com mail-engine.yourplatform.com
```

## What's not verified yet / open questions for the app repo

- SOGo webmail login has a known local-only bug (see `server-progress.md` gotcha #4) — re-check once
  running on the real VPS before assuming webmail works end-to-end.
- Rate limiting / abuse prevention for self-service signup (a bad actor spinning up domains to spam)
  is not addressed here — worth deciding before opening signup publicly.
- Billing/plan limits (mailboxes/aliases/quota per customer) map to fields already in the `/add/domain`
  call (`mailboxes`, `aliases`, `quota`) — the app just needs to decide what values per plan tier.
