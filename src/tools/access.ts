/**
 * Which tools are exposed. Every tool must be listed here, so a new tool can't be registered without a decision about
 * its risk.
 *
 * - read: only reads FreeAgent (invoice_pdf_get can also save into FREEAGENT_DOWNLOAD_DIR)
 * - write: records receipts and expenses, explains bank transactions, manages bills and contacts
 * - risky: anything a client sees or that destroys data: invoices, emailing, and deletes. Off unless enabled
 */
export type ToolTier = 'read' | 'write' | 'risky';

export const TOOL_TIERS: Readonly<Record<string, ToolTier>> = {
	company_get: 'read',
	company_tax_timeline_get: 'read',
	user_me_get: 'read',
	users_list: 'read',
	categories_list: 'read',
	bank_account_get: 'read',
	bank_accounts_list: 'read',
	projects_list: 'read',
	vat_return_get: 'read',
	vat_returns_list: 'read',
	contact_get: 'read',
	contacts_list: 'read',
	invoice_get: 'read',
	invoice_pdf_get: 'read',
	invoices_list: 'read',
	bill_get: 'read',
	bills_list: 'read',
	expense_get: 'read',
	expenses_list: 'read',
	bank_transaction_get: 'read',
	bank_transactions_list: 'read',
	bank_transaction_explanation_get: 'read',
	bank_transaction_explanations_list: 'read',
	attachment_get: 'read',
	profit_and_loss_get: 'read',
	balance_sheet_get: 'read',
	trial_balance_get: 'read',
	cashflow_get: 'read',

	contact_create: 'write',
	contact_update: 'write',
	bill_create: 'write',
	bill_update: 'write',
	expense_create: 'write',
	expense_update: 'write',
	bank_transaction_explanation_create: 'write',
	bank_transaction_explanation_update: 'write',

	invoice_create: 'risky',
	invoice_update: 'risky',
	invoice_transition: 'risky',
	invoice_send_email: 'risky',
	invoice_delete: 'risky',
	bill_delete: 'risky',
	expense_delete: 'risky',
	bank_transaction_explanation_delete: 'risky',
	attachment_delete: 'risky',
};

export const DEFAULT_TOOLS = 'read,write';

const TIERS = new Set<string>(['read', 'write', 'risky']);

/**
 * Parse a FREEAGENT_TOOLS value: comma-separated tiers (read, write, risky), "all", or tool names.
 * A leading "-" removes a tier or tool, e.g. "read,write,-contact_update" or "read,invoice_create".
 */
export function resolveToolSelection(spec: string | undefined = DEFAULT_TOOLS): Set<string> {
	const add = new Set<string>();
	const remove = new Set<string>();
	const tokens = spec.split(',').map((token) => token.trim()).filter(Boolean);
	if (tokens.length === 0) {
		throw new Error('freeagent-mcp: FREEAGENT_TOOLS is empty; use e.g. "read" or "read,write"');
	}

	for (const token of tokens) {
		const target = token.startsWith('-') ? remove : add;
		const name = token.replace(/^-/, '');
		const matches = name === 'all'
			? Object.keys(TOOL_TIERS)
			: (TIERS.has(name) ? Object.keys(TOOL_TIERS).filter((tool) => TOOL_TIERS[tool] === name) : [name]);
		for (const tool of matches) {
			if (!(tool in TOOL_TIERS)) {
				throw new Error(`freeagent-mcp: Unknown tool or tier "${name}" in FREEAGENT_TOOLS. Tiers are read, write, risky and all`);
			}

			target.add(tool);
		}
	}

	return new Set([...add].filter((tool) => !remove.has(tool)));
}
