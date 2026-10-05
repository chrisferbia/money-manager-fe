# Crypto price controls

- Settings includes a signed-in-only Crypto price expiry panel.
- Load the user's saved setting from GET /settings/crypto-prices. Save with PATCH
  and an integer expiry_minutes between 1 and 1440. Default is 10 minutes.
- Prevent invalid/unchanged saves and concurrent submissions. Show loading,
  retryable load errors, save failures and confirmation. Persist on the backend,
  not browser storage; invalidate account and holding data after a change.
- Explain that expiry triggers refresh on reads, not background scheduling.
- Each crypto account's holdings panel has Refresh all crypto prices. POST to
  /accounts/{id}/holdings/refresh-prices, refreshing every distinct coin held
  across the signed-in user's workspace and bypassing the backend cache expiry.
- Disable refresh while busy/loading. Empty wallets may refresh other wallets;
  report when the whole workspace has no holdings. Hide it in read-only
  demos. Show refresh progress and prevent duplicate requests.
- Use returned holdings_by_account to update all wallet caches without separate
  holdings fetches, and reload account balances. Report partial success
  with failed coins; retain old prices and show a retryable error on failure.
- Test settings persistence/validation/error recovery, refresh success/failure,
  partial quotes (including another wallet's coins), duplicate clicks, empty
  holdings, all-wallet cache updates and demo restrictions.
- Automatic expiry, per-coin timestamps and failure retry rules are unchanged.
- Browser verification uses tests/manual/crypto-preview.html and the backend's
  fictional in-memory crypto_preview.py. Production entrypoints retain Clerk.
