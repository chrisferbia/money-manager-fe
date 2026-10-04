# BCA import inbox

- Authenticated users can open Import inbox; it is excluded from anonymous demo navigation and direct demo hashes.
- Upload an original BCA `.eml` into a ledger account. Show success/error/duplicate feedback. Crypto accounts cannot be selected.
- Pending cards show the parsed merchant, date, direction, amount, reference, category suggestion and its reason. Suggestions are editable. Uncertain items have no preselected category.
- Approve requires a valid account and a category of the matching type. The optional merchant rule checkbox is unchecked initially. Successful approval refreshes transactions, balances and reports.
- Skip records history without changing the ledger. Approved/skipped notifications cannot be approved from history.
- Merchant rules support category changes and removal, without changing existing transactions.
- Pending items and history show up to the latest 100 records; when capped the UI says so.
- Upload and card controls align on desktop and stack at small widths. Tab controls support arrow keys, Home and End.
- A fictional sample is available for trying the workflow; approving it creates an actual entry in the user's ledger.
- Automatic email delivery remains a separate workspace-1 importer reached by the existing private Email Routing rule. Manual review uses saved rules and approved history, without an AI provider, and supports the user's `Other` expense category.

Verification: backend parsing/staging/approval/isolation/migration tests; frontend upload/approval/rules/error/demo/accessibility tests; local browser review at desktop and phone widths.
