# Stock sell functionality

## User-facing result
- Add a real “My Stocks” position view to the signed-in dashboard.
- Show the current recognized value separately from the administrator’s target/scenario value.
- Let users sell all or a supported partial amount at the current value, with a confirmation step and a success receipt.
- Credit the existing available balance and add the sale to the existing transaction history.
- Add sale fields and position status to the administrator’s user-stock view.

## Technical implementation
- Extend the existing `nft_charts` position record with purchase, share, sale, remaining-value, status, fee, and sale-transaction fields; preserve the existing one-position-per-user model.
- Add a server-side atomic sale function that locks the position, verifies ownership and active state, calculates current value from the same live/stop/idle valuation rules, proportionally reduces partial positions, inserts a sale transaction, and credits the existing balance in one database transaction.
- Add a protected TanStack server function that calls the database sale operation and returns a plain receipt DTO. Use the existing authenticated function middleware and wallet/transaction tables.
- Add the dashboard sell dialog, validation, receipt, portfolio refresh, and transaction display. Keep the fee at zero unless a future fee is configured.
- Add an admin User Stocks section with position, valuation, sale, transaction, and status fields.
- Update transaction metadata and generated database typings as needed after the schema change.
- Validate with the project build plus live preview checks for dashboard and admin states.
