# Transaction list labels and compact rows

- Desktop and mobile share two lines: Cat/Type above Desc in the first column,
  Acc/From above PayTo/From/To in the second, and a larger right-aligned amount
  spanning both lines. Value starts align vertically and across transactions.
- Values are larger and heavier than muted labels. Expense rows are softly red,
  income softly green, and transfers softly blue with a neutral unsigned amount.
- Transfers show Type: Transfer, From and To accounts, and description.
  Do not count transfers as income or expenses.
- Long values truncate without hiding their field labels. Tap, click, Enter,
  or Space invokes the existing edit callback directly, preserving the row as
  the focus-restoration trigger. No expandable details or extra Edit button.
- Read-only rows are disabled and never invoke editing. Date sorting,
  created-date grouping, pagination and daily subtotal calculations are unchanged.
- Tests cover labels, all transaction types, direct click/keyboard editing, demo
  restrictions, placeholders and empty lists. The isolated manual preview uses
  fictional data and no API, authentication, or database.
