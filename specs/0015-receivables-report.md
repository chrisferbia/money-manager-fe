# All-time receivables report

- Reports contains an account selector for ledger accounts (not crypto holdings).
- GET /reports/receivables?account_id=N verifies workspace ownership. Demo reads
  use the same endpoint under /demo and remain restricted to fictional workspace 1.
- Only transfers are included. Destination = selected account adds lent;
  source = selected account adds repaid; outstanding = lent minus repaid.
- No dates or pagination limit: loans from earlier periods remain included.
- Group by trimmed description, case-sensitive. Null/blank descriptions share
  one explicitly named Missing description group. No data is rewritten.
- Sort by outstanding descending. Hide zero balances by default; a checkbox
  reveals settled groups. Show negative balances as credit/overpayment.
- Total owed sums positive outstanding values, never offset by overpayments.
- Selection changes clear old data; late responses cannot overwrite a new account.
- Errors provide Retry; loading, no-selection, empty states remain explicit.
- Existing expense/savings reports are unchanged. No migration is required.
