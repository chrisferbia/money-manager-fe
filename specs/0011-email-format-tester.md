# Settings: BCA email format tester

- Authenticated users find the tester in Settings, not a separate navigation page. Anonymous demo users cannot access it. Old `#imports` bookmarks resolve to Settings (Overview in demo).
- Choose a non-empty `.eml` up to 1 MB, or try the fictional sample without creating an account.
- Submit only to `POST /email-tools/bca/preview`. No approval, skip, history, account/category selection or merchant-rule controls remain.
- Show parsed amount explicitly in IDR, date explicitly in Asia/Jakarta, type/subtype, merchant, description, bank reference, status, default automatic category, sender, subject and message ID.
- Show parsing errors and format warnings. Clear stale output before a new test or when choosing another file. Prevent concurrent submissions.
- Explain that the file is transmitted to the backend for parsing but is not stored. Neither tests nor samples change balances, reports, pending records or rules. Results are component-local, not persisted or cached.
- Clarify that format testing is not a delivery/account/authenticity check. Automatic inbound email imports remain separate and unchanged, including `Other` for expenses.
- Use aligned controls on desktop and stacked fields on small screens.

Verification: backend no-write snapshots, malformed input/limits/auth tests and existing automatic import tests; frontend settings/navigation/demo, file/sample/error/warning tests; full build and browser checks at desktop and phone widths.
