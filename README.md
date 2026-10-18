# freeagent-mcp

An MCP server that lets Claude (or any MCP client) do bookkeeping in [FreeAgent](https://www.freeagent.com): look up and raise invoices, record bills and expenses, reconcile bank transactions, and pull P&L, balance sheet, trial balance and cashflow reports.

## Tools

| Area | Tools |
|---|---|
| Company & reference | `company_get`, `company_tax_timeline_get`, `user_me_get`, `users_list`, `categories_list`, `bank_accounts_list`, `bank_account_get`, `projects_list`, `vat_returns_list`, `vat_return_get` |
| Contacts | `contacts_list`, `contact_get`, `contact_create`, `contact_update` |
| Invoices | `invoices_list`, `invoice_get`, `invoice_create`, `invoice_update`, `invoice_delete`, `invoice_transition`, `invoice_send_email`, `invoice_pdf_get` |
| Bills | `bills_list`, `bill_get`, `bill_create`, `bill_update`, `bill_delete` |
| Expenses | `expenses_list`, `expense_get`, `expense_create`, `expense_update`, `expense_delete` |
| Banking | `bank_transactions_list`, `bank_transaction_get`, `bank_transaction_explanations_list`, `bank_transaction_explanation_get`, `bank_transaction_explanation_create`, `bank_transaction_explanation_update`, `bank_transaction_explanation_delete` |
| Attachments | `attachment_get`, `attachment_delete` |
| Reports | `profit_and_loss_get`, `balance_sheet_get`, `trial_balance_get`, `cashflow_get` |

Some things to know about the tools:

- **References:** anywhere a tool asks for a contact, invoice, category and so on, you can pass either the ID (`"42"`, or a nominal code like `"285"` for categories) or the full FreeAgent URL.
- **List tools:** these take `page` and `per_page` (max 100) and return `has_more` and `total_count`.
- **Money:** amounts are decimal strings like `"120.00"`.
- **Expense signs:** `gross_value` on expenses is **negative** when the claimant paid.
- **Explanation signs:** `gross_value` on bank explanations has the same sign as the bank transaction.
- **Other fields:** create and update tools accept an `extra_fields` object for less common FreeAgent attributes; see the [API docs](https://dev.freeagent.com/docs/index).
- **Attachments:** expenses, bills and bank transaction explanations take an `attachment` (a receipt or invoice). Use `bank_transaction_explanation_update` to add a receipt to a transaction that's already explained. Explanation receipts go through FreeAgent's attachments endpoint (API version `2026-09-01`), which replaces the inline `attachment` field from 1 December 2026. If the explanation saves but the upload fails, the error says so. Attachments must really be a PDF, PNG, JPEG or GIF.

### Which tools are enabled

Tools are grouped into three tiers. By default only `read` and `write` are enabled:

| Tier | Tools |
|---|---|
| `read` | Every `_get` and `_list` tool, plus the reports. `invoice_pdf_get` can also save into `FREEAGENT_DOWNLOAD_DIR` |
| `write` | `expense_create`/`_update`, `bank_transaction_explanation_create`/`_update`, `bill_create`/`_update`, `contact_create`/`_update` |
| `risky` | `invoice_create`, `invoice_update`, `invoice_transition`, `invoice_send_email`, and every `_delete` tool |

Set `FREEAGENT_TOOLS` to a comma-separated list of tiers (`read`, `write`, `risky`, `all`) and tool names. Prefix an entry with `-` to remove it. For example, `read` gives a read-only server, and `read,write,invoice_create` adds draft invoices without email or deletes. Unknown names stop the server from starting.

### Local files

`file_path` attachments can only be read from folders listed in `FREEAGENT_ATTACHMENT_DIRS`. The path must be absolute, and symlinks are resolved before the check. `invoice_pdf_get` only saves into `FREEAGENT_DOWNLOAD_DIR` and never overwrites an existing file. Both are off when unset.

> [!WARNING]
> This server can create, change and delete accounting records, and `invoice_send_email` sends real email to your clients. Content Claude reads (contact names, bank transaction descriptions, attachments) could contain prompt-injection attempts. Keep tool approval on for write tools, and try things out in the sandbox first.

## Setup

### 1. Create a FreeAgent app

1. Sign in at [dev.freeagent.com](https://dev.freeagent.com) and create an app.
2. Add `http://localhost:8976/callback` as a redirect URI.
3. Note the OAuth identifier (client ID) and secret.

For testing, create a [sandbox account](https://dev.freeagent.com/docs/quick_start) and use `FREEAGENT_ENV=sandbox` (the default). Switch to `FREEAGENT_ENV=production` for your real books.

### 2. Connect your FreeAgent account

```sh
npm install && npm run build
FREEAGENT_CLIENT_ID=... FREEAGENT_CLIENT_SECRET=... FREEAGENT_ENV=sandbox node dist/main.js auth
```

This opens FreeAgent in your browser. Once you approve, it saves tokens to `~/.config/freeagent-mcp/tokens.<env>.json` with mode 0600. Access tokens last an hour. The server refreshes them automatically and saves each rotated refresh token back to that file.

### 3. Add it to Claude Code

```sh
claude mcp add freeagent \
  -e FREEAGENT_CLIENT_ID=... \
  -e FREEAGENT_CLIENT_SECRET=... \
  -e FREEAGENT_ENV=sandbox \
  -e FREEAGENT_ATTACHMENT_DIRS="$HOME/Documents/Receipts" \
  -- node /path/to/freeagent-mcp/dist/main.js
```

Claude Desktop uses the same `command`, `args` and `env` in `claude_desktop_config.json`.

## Remote / Docker (Coolify)

The Docker image runs the HTTP transport on port 3000, with bearer-token auth on `/mcp` and a `/health` endpoint. Tokens live on a `/data` volume.

1. Get a refresh token just for the server by running the auth flow with a throwaway token file:
   ```sh
   FREEAGENT_TOKEN_FILE=/tmp/fa-server.json FREEAGENT_CLIENT_ID=... FREEAGENT_CLIENT_SECRET=... FREEAGENT_ENV=production node dist/main.js auth
   ```
2. Set these environment variables in Coolify:
   - `FREEAGENT_CLIENT_ID`
   - `FREEAGENT_CLIENT_SECRET`
   - `FREEAGENT_ENV`
   - `FREEAGENT_REFRESH_TOKEN`: the `refresh_token` from `/tmp/fa-server.json`
   - `MCP_AUTH_TOKEN`: generate one with `openssl rand -hex 32`
3. Delete `/tmp/fa-server.json`. FreeAgent rotates refresh tokens, so two copies of the same token in use will lock each other out.
4. Deploy `docker-compose.yaml`. On first use the server swaps the seed token for a fresh pair and stores it in the volume. After that, `FREEAGENT_REFRESH_TOKEN` is ignored.
5. Connect Claude Code:
   ```sh
   claude mcp add --transport http freeagent https://your-domain/mcp --header "Authorization: Bearer <MCP_AUTH_TOKEN>"
   ```

If the volume is ever lost, repeat steps 1 to 4.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `FREEAGENT_CLIENT_ID` / `FREEAGENT_CLIENT_SECRET` | required | OAuth app credentials |
| `FREEAGENT_ENV` | `sandbox` | `sandbox` or `production` |
| `FREEAGENT_TOKEN_FILE` | `~/.config/freeagent-mcp/tokens.<env>.json` | Where tokens are stored |
| `FREEAGENT_REFRESH_TOKEN` | – | Seed token used only when the token file doesn't exist |
| `FREEAGENT_REDIRECT_PORT` | `8976` | Local port for the `auth` callback |
| `FREEAGENT_BASE_URL` | – | Override the API base URL |
| `FREEAGENT_TOOLS` | `read,write` | Tiers and tool names to enable (see above) |
| `FREEAGENT_ATTACHMENT_DIRS` | – | Colon-separated absolute folders that `file_path` attachments may be read from |
| `FREEAGENT_DOWNLOAD_DIR` | – | Absolute folder that `invoice_pdf_get` may save PDFs into |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_AUTH_TOKEN` | required for http | Bearer token clients must send |
| `MCP_ALLOW_UNAUTHENTICATED` | `false` | Allow HTTP without `MCP_AUTH_TOKEN` (only behind another auth layer) |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | HTTP listen address |

## Development

```sh
npm test        # unit + in-memory MCP tests (FreeAgent API mocked)
npm run lint
npm run build
npx @modelcontextprotocol/inspector node dist/main.js   # try tools against the sandbox
```

Each tool lives in its own file under `src/tools/` and is registered in `src/tools/index.ts`. HTTP, token refresh, 401 retry and 429 `Retry-After` handling live in `src/utils/freeagent-api.ts` and `src/auth/token-store.ts`.
