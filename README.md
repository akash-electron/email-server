# Self-Hosted Mail Server Setup Guide

## Goal

Build a complete, self-hosted email server that:

* Sends emails
* Receives emails
* Supports multiple domains
* Supports unlimited mailboxes
* Has a Gmail-like webmail interface
* Provides SMTP, IMAP, and POP3
* Can be used by applications (OTP, notifications, etc.)
* Uses only free and open-source software
* Does not depend on third-party email providers

---

# Project Architecture

```
Internet
       │
       ▼
 ┌───────────────────────┐
 │      Cloud DNS        │
 └──────────┬────────────┘
            │
            ▼
 ┌───────────────────────┐
 │ Ubuntu 24.04 Server   │
 │ Static Public IPv4    │
 └──────────┬────────────┘
            │
 ┌──────────┼───────────┐
 ▼          ▼           ▼
SMTP      IMAP        Webmail
(Postfix) (Dovecot)  (Roundcube)

            │
            ▼
 Mail Storage

            │
            ▼
Spam Filter (Rspamd)

            │
            ▼
DKIM + SPF + DMARC
```

---

# Minimum Server Requirements

## Development

* 2 vCPU
* 2 GB RAM
* 25 GB SSD
* Ubuntu 24.04 LTS

---

## Production

* 2–4 vCPU
* 4–8 GB RAM
* 80 GB SSD
* Static IPv4
* Ubuntu 24.04 LTS

---

# Domain Requirements

Example

```
example.com
```

Subdomains

```
mail.example.com
smtp.example.com
imap.example.com
webmail.example.com
```

---

# DNS Records

## A Records

```
mail.example.com

smtp.example.com

imap.example.com

webmail.example.com
```

Point all to the server IP.

---

## MX Record

```
Priority 10

mail.example.com
```

---

## SPF

```
v=spf1 mx ip4:SERVER_IP -all
```

---

## DKIM

Generated during installation.

---

## DMARC

```
v=DMARC1;

p=quarantine;

rua=mailto:dmarc@example.com
```

---

## Reverse DNS (PTR)

```
SERVER_IP

↓

mail.example.com
```

Configure this with your VPS provider.

---

# Open Ports

```
22 SSH

25 SMTP

465 SMTPS

587 SMTP Submission

110 POP3

995 POP3 SSL

143 IMAP

993 IMAP SSL

80 HTTP

443 HTTPS
```

---

# Software Stack

## Operating System

Ubuntu 24.04 LTS

---

## Mail Server

Postfix

Purpose

* SMTP
* Outgoing mail
* Incoming SMTP

---

## Mailbox Server

Dovecot

Purpose

* IMAP
* POP3
* Authentication

---

## Spam Protection

Rspamd

Features

* Spam detection
* Greylisting
* Rate limiting
* Bayesian filtering
* Antivirus integration

---

## DKIM

OpenDKIM

Purpose

Digitally sign outgoing emails.

---

## DMARC

OpenDMARC

Purpose

DMARC validation.

---

## SSL

Let's Encrypt

Renew automatically.

---

## Web Server

Nginx

Purpose

* Reverse proxy
* SSL termination
* Webmail hosting

---

## Webmail

Roundcube

Users can access

```
https://webmail.example.com
```

---

# Directory Structure

```
mail-server/

├── README.md

├── docker/

├── nginx/

├── postfix/

├── dovecot/

├── rspamd/

├── opendkim/

├── certificates/

├── backups/

├── logs/

├── scripts/

└── monitoring/
```

---

# Mailboxes

Examples

```
admin@example.com

support@example.com

sales@example.com

billing@example.com

noreply@example.com

otp@example.com
```

---

# Security

Enable

* Fail2Ban
* UFW Firewall
* SSH Keys
* Disable Root Login
* Automatic Security Updates
* Strong Password Policy
* TLS 1.2+
* Daily Backups

---

# Monitoring

Recommended tools

* Prometheus
* Grafana
* Netdata
* Uptime Kuma

Monitor

* CPU
* RAM
* Disk
* Queue Size
* SMTP Errors
* Failed Logins

---

# Email Authentication Checklist

* SPF
* DKIM
* DMARC
* Reverse DNS
* Valid HELO
* TLS Enabled
* Matching Hostname

---

# Deliverability Checklist

Before sending production emails

* SPF Pass
* DKIM Pass
* DMARC Pass
* Reverse DNS Configured
* SSL Valid
* Mail Queue Healthy
* Spam Score Low
* IP Not Blacklisted

---

# Backup Strategy

Daily

* Mailboxes
* Database
* Configuration

Weekly

* Full Server Backup

Monthly

* Offsite Backup

---

# Scaling

Future improvements

* Multiple Domains
* Multiple Mail Servers
* Load Balancer
* Shared Storage
* High Availability
* Clustering
* Automatic Failover

---

# Optional APIs

Future integrations

* REST API
* SMTP API
* Mail Queue API
* User Management API
* Domain Management API
* Attachment Upload API

---

# Mobile Clients

Compatible with

* Apple Mail
* Outlook
* Thunderbird
* Gmail App (IMAP)
* K-9 Mail

---

# Future Features

* Calendar
* Contacts
* Tasks
* Shared Mailboxes
* Aliases
* Catch-All Domains
* Email Forwarding
* Auto Reply
* Vacation Mode
* Email Rules
* Sieve Filters

---

# Recommended Installation Order

1. Ubuntu Server
2. Update System
3. Configure Hostname
4. Configure DNS
5. Install Nginx
6. Install SSL
7. Install Postfix
8. Install Dovecot
9. Configure Mailboxes
10. Install Rspamd
11. Configure DKIM
12. Configure DMARC
13. Install Roundcube
14. Configure Firewall
15. Configure Backups
16. Test Sending
17. Test Receiving
18. Verify Deliverability
19. Production Deployment

---

# Project Goal

A fully self-hosted, production-ready email platform with complete control over:

* Sending
* Receiving
* Authentication
* Storage
* Webmail
* Security
* Backups
* Monitoring
* APIs

without relying on third-party email providers.
