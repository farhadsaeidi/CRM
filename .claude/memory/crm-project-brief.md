---
name: crm-project-brief
description: CRM is a DRF+React rewrite of the legacy CustomerManagement Django app, modeled on SAM's architecture, keeping the old database
metadata:
  node_type: memory
  type: project
---

`CRM` is a ground-up rewrite of `D:\Python\Django\CustomerManagement` — a Persian/RTL
customer-ledger app where each owner tracks their customers' credit (`debt`) and
payment (`paid`) transactions, and each customer's account status is derived as
بدهکار / بستانکار / بی‌حساب.

The old app is classic Django: `django.views.View` classes that both render HTML
templates and answer AJAX POSTs with hand-built `JsonResponse`, plus `django-vite`
injecting React bundles into Django templates. The rewrite splits those layers —
Django becomes a pure **DRF API**, React becomes a standalone **SPA** — following the
architecture of the SAM project at `/home/farhad/projects/python/django/SAM`, which
Farhad named as the model to copy.

Decided by Farhad (2026-08-20):
- The project lives in its own directory, `CRM`, separate from `CustomerManagement`.
- It reuses the **existing** `CRM` database with its existing data — see
  [[crm-legacy-migrations]] and [[crm-db-access]].
- Build order: bare skeleton first, then he directs each next phase.

**Why:** he wants the same foundation that worked on SAM, but he is driving the
sequencing himself rather than having the whole app generated at once.
**How to apply:** treat SAM as the reference implementation for structure, naming and
conventions — but never assume a SAM feature belongs in CRM (roles, tickets, chat,
OTP templates are SAM-specific). Ask or check before importing a SAM concept, and
wait for Farhad's go-ahead between phases. See [[crm-skeleton-state]].
