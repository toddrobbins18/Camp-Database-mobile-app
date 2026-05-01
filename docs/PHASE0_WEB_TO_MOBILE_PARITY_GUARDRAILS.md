# Phase 0 - Web-to-Mobile Parity Guardrails

This project uses a centralized Supabase backend with two separate repos:

- `tyler-hill` (web): canonical source of truth for business rules, sync behavior, and RLS intent.
- `datacamp-mobile` (mobile): deployment lane for centralized DB migrations and edge functions.

This file defines the mandatory checks before deploying backend-affecting changes from mobile.

## 1) Governance Lock

1. **Canonical behavior source:** `tyler-hill`
2. **Deployment lane:** `datacamp-mobile`
3. **No direct behavior divergence:** if mobile differs from web for shared backend logic, align mobile to web (or explicitly approve a documented exception).

## 2) Mandatory Pre-Deploy Checklist

Before running `supabase db push` or deploying functions from mobile, verify:

1. **CampMinder Sync Parity**
   - Compare:
     - `tyler-hill/supabase/functions/sync-campminder/index.ts`
     - `datacamp-mobile/supabase/functions/sync-campminder/index.ts`
   - Confirm status filters, guardian extraction priority, cleanup behavior, and season fallback match approved behavior.

2. **Owl Pay Schema/RLS Parity**
   - Confirm mobile migrations preserve web-intended table shape, constraints, and policy behavior for:
     - `owl_pay_transactions` (including `staff_id` rules)
     - `owl_pay_email_config`
     - related RLS updates

3. **Function Parity for Shared Features**
   - For shared functions (example: `send-owlpay-notifications`), ensure web and mobile copies are functionally identical before deploy.

4. **Centralized DB Verification**
   - Run SQL checks in Supabase after migration for all new columns/FKs/check constraints.
   - Keep screenshots or query output for audit.

## 3) Approval Gates (Required)

For backend-impacting work, do not batch everything at once. Use gated phases:

1. DB/schema changes approved and verified
2. App write-path changes approved
3. Notification/function changes approved
4. End-to-end validation approved

## 4) Exception Rule

If mobile intentionally diverges from web:

1. Document the reason and scope in this file (or linked doc).
2. Record who approved it.
3. Add a reconciliation follow-up task with owner and deadline.

## 5) Operational Notes

- Centralized Supabase means migrations/functions must be deployed once per project, but parity must be maintained in both repos.
- Avoid editing production `.env` values during merge conflict resolution without explicit verification.
