# Mamba Robot Integration

## What will change
- Add a prominent Mamba Robot section to the existing dashboard for current and future users.
- Provide a fixed marketplace of 50 monthly packages priced from $700 to $70,000, with increasing daily allowances and clear risk disclosures.
- Add a dedicated Mamba Robot action in the existing admin menu for subscriber review, individual access/allowance controls, annual requests, and audited global pause controls.
- Keep real trade execution disabled and clearly marked unavailable until a legitimate execution provider and verified market data are configured; never show invented activity or results.

## Wallet purchase behavior
- Quote each USD package price into the user's wallet currency using Frankfurter's v2 reference-rate API, which aggregates official central-bank sources and requires no API key; clearly show the rate date/source and wallet debit before confirmation.
- Treat the quote as a reference rate, not a real-time executable FX price. Fail closed when the user's currency has no available rate or the provider is unavailable; do not debit using a guessed, stale, or client-supplied rate.
- Keep the server authoritative for the quote and atomically perform balance validation, idempotency, subscription creation, and an account-history entry. Insufficient funds will offer the existing funding path.
- Standard subscriptions last 30 days. Annual requests remain pending until admin approval and a confirmed price/payment.

## Technical details
- Add protected Lovable Cloud tables and database functions for packages, subscriptions, annual requests, robot controls, and admin audit history; seed the 50 fixed packages once.
- Use authenticated server functions and server-side admin checks; users only read their own records, admins can review all subscribers.
- Integrate the user section into the existing dashboard navigation and the admin controls into the existing admin action menu; preserve the current wallet and auth systems.
- Add focused checks for the 50-package catalog, package endpoints, allowance bounds, and shared subscription rules, then verify user/admin flows and mobile layout.