# Crypto price controls

- Settings includes a signed-in-only Crypto price expiry panel.
- Load the user's saved setting from GET /settings/crypto-prices. Save with PATCH
  and an integer expiry_minutes between 1 and 1440. Default is 10 minutes.
- Prevent invalid/unchanged saves and concurrent submissions. Show loading,
  retryable load errors, save failures and confirmation. Persist on the backend,
  not browser storage; invalidate account and holding data after a change.
- Explain that expiry triggers refresh on reads, not background scheduling.
- Each crypto account's holdings panel has Refresh prices. POST to
  /accounts/{id}/holdings/refresh-prices, bypassing the backend cache expiry.
- Disable refresh while busy/loading or without holdings. Hide it in read-only
  demos. Show refresh progress and prevent duplicate requests.
- Use the returned holdings and reload account balances. Report partial success
  with failed coins; retain old prices and show a retryable error on failure.
- Test settings persistence/validation/error recovery, refresh success/failure,
  partial quotes, duplicate clicks, empty holdings and demo restrictions.
- Browser verification uses tests/manual/crypto-preview.html and the backend's
  fictional in-memory crypto_preview.py. Production entrypoints retain Clerk.
