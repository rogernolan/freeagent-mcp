# Matching, VAT and FreeAgent conventions

## Contents
- Matching receipts to bank transactions
- Company or personal payment
- Transactions that don't need a receipt
- VAT (UK, VAT-registered company)
- Categories
- Signs and amounts in FreeAgent

## Matching receipts to bank transactions

- **Amount**: the receipt total including VAT should equal the transaction amount exactly (ignoring the sign).
- **Date**: card payments usually reach the bank 0–3 days after the receipt date, sometimes up to 5. Within 3 days is
  exact; 4–7 days is probable; further apart needs the user.
- **Supplier**: bank descriptions are short, upper-case and often go through a payment processor, e.g.
  `AMZNMKTPLACE`, `TFL TRAVEL CH`, `PAYPAL *ADOBE`, `SQ *CAFE NAME`, `SUMUP *`. Compare loosely and say what you matched
  on when it isn't obvious.
- **Foreign currency**: a receipt in USD or EUR won't match the GBP amount. Match on supplier and date and mark it
  probable. Leave `gross_value` out so FreeAgent explains the full GBP amount.
- **Repeated amounts** (subscriptions, regular suppliers): pair each receipt with the transaction nearest in date. Never
  attach one receipt to two transactions.
- **One payment, several receipts** (e.g. an order delivered in parts): propose a split, with one explanation per
  receipt whose `gross_value`s add up to the transaction amount. Mark it probable.
- **One receipt, several payments** (deposit and balance): put it in group F and ask.
- **Refunds** (money in from a supplier): match to the credit note or refund receipt, using the original purchase's
  category with a positive amount.

## Company or personal payment

A receipt with no matching company bank transaction may have been paid personally, making it a director expense
claim (group D). Signs of a personal payment: a card number on the receipt that isn't the company's card, "cash",
or a personal account name. If the receipt shows card digits and you don't know which card is the company's, ask once
and record the answer in the notes file (see SKILL.md).

If there's no evidence either way and no matching transaction, the payment may not have reached the bank yet. Put it
in group F rather than claiming it as an expense; a duplicate claim is harder to undo.

## Transactions that don't need a receipt

Don't list these as missing receipts (group E). Put them in group F with a suggested treatment for the user to
confirm:

- Transfers between the company's own accounts (suggest `transfer_bank_account`).
- Payments to or from the director: salary, dividends, expense reimbursements, director's loan (suggest `paid_user`
  and ask which).
- HMRC payments (VAT, PAYE, corporation tax).
- Bank charges and interest.

## VAT (UK, VAT-registered company)

The company can reclaim VAT only with a valid VAT receipt or invoice, which shows the supplier's VAT registration
number. Receipts for £250 or less may be simplified ones without a full VAT breakdown.

| Receipt shows | What to record |
|---|---|
| VAT number and VAT at 20% or 5% | `sales_tax_rate` "20.0" or "5.0" |
| VAT number, VAT at 0% (train tickets, books, most food from shops) | `sales_tax_rate` "0.0" |
| No VAT number, or the supplier isn't VAT registered | `sales_tax_rate` "0.0"; note "no VAT receipt" |
| Exempt items (insurance, Royal Mail stamps, financial services) | `sales_tax_status` "EXEMPT" |
| Mixed rates on one receipt | `sales_tax_rate` for the main rate, plus the receipt's actual VAT amount: `sales_tax_value` on an explanation, `manual_sales_tax_amount` on an expense |

Raise these with the user instead of deciding (group F, or a note on the row):

- **Client entertainment**: the VAT can't be reclaimed. Staff entertainment VAT usually can.
- **Overseas suppliers** (e.g. US or EU software subscriptions): usually no UK VAT on the receipt, and the reverse
  charge may apply. Ask how the company normally records that supplier.
- **Cars, fuel and mileage**, which have special VAT rules.
- Anything where the VAT on the receipt doesn't look like 20%, 5% or 0% of the net amount.

This is bookkeeping, not tax advice. When the treatment is unclear, say so and suggest the user checks with their
accountant.

## Categories

Pick categories by name from `categories_list`, and show the name in the plan so the user can check it. Be
consistent: if the notes file records a category for a supplier, use it. When a supplier is new, choose the closest
category and mark it in the plan so the user notices.

## Signs and amounts in FreeAgent

- Amounts are decimal strings, like `"42.50"`.
- **Explanations**: `gross_value` has the same sign as the bank transaction, so it's negative for money out. Leave it
  out to explain the whole transaction.
- **Expense claims**: `gross_value` is negative for money the director spent and is owed back, e.g. `"-42.50"`.
- After the first write of each kind, check the amounts and VAT FreeAgent returns. If they don't match what you
  intended, stop and report rather than repeating the mistake on every row.
