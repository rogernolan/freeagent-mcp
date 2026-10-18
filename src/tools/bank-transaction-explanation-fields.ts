import {z} from 'zod';
import type {Config} from './types.js';
import type {FreeAgentApi} from '../utils/freeagent-api.js';
import {
	type AttachmentInput, buildAttachment, compact, optionalRef,
} from '../utils/tools.js';
import {
	attachment, date, money, ref, salesTaxStatus,
} from './schemas.js';

export const explanationFields = {
	dated_on: date.optional().describe('Date (YYYY-MM-DD). Defaults to the bank transaction\'s date'),
	gross_value: money.optional().describe('Amount including VAT, with the same sign as the bank transaction: negative for money out, positive for money in. '
		+ 'Defaults to the full unexplained amount; give a smaller value to split a transaction'),
	description: z.string().optional().describe('Not needed for invoice receipts, bill payments or transfers'),
	category: ref('Category (nominal code, e.g. "285")').optional().describe('Accounting category. Omit when using paid_invoice, paid_bill or transfer_bank_account'),
	paid_invoice: ref('Invoice').optional().describe('Invoice ID or URL this money-in pays'),
	paid_bill: ref('Bill').optional().describe('Bill ID or URL this money-out pays'),
	transfer_bank_account: ref('Bank account').optional().describe('Other bank account ID or URL, for transfers between your own accounts'),
	paid_user: ref('User').optional().describe('User ID or URL, for payments to or from a director/employee (e.g. salary, expense reimbursement)'),
	sales_tax_status: salesTaxStatus.optional(),
	sales_tax_rate: money.optional().describe('VAT rate as a percentage, e.g. "20.0"'),
	sales_tax_value: money.optional().describe('VAT amount, overriding the calculated value'),
	foreign_currency_value: money.optional().describe('Amount in the invoice/bill currency, when paying a foreign-currency invoice or bill'),
	project: ref('Project').optional(),
	attachment: attachment.optional().describe('Receipt or invoice to add to the explanation\'s attachments. Provide either `data` (base64) or `file_path`'),
};

/** Explanation attachments have their own endpoint from this API version; the old inline `attachment` field goes away on 2026-12-01 */
const ATTACHMENTS_API_VERSION = '2026-09-01';

type ExplanationInput = {
	[key: string]: unknown;
	category?: string | undefined;
	paid_invoice?: string | undefined;
	paid_bill?: string | undefined;
	transfer_bank_account?: string | undefined;
	paid_user?: string | undefined;
	project?: string | undefined;
	extra_fields?: Record<string, unknown> | undefined;
};

export function explanationBody(api: FreeAgentApi, {
	category, paid_invoice, paid_bill, transfer_bank_account, paid_user, project, extra_fields, ...fields
}: ExplanationInput) {
	return compact({
		...fields,
		category: optionalRef(api, 'categories', category),
		paid_invoice: optionalRef(api, 'invoices', paid_invoice),
		paid_bill: optionalRef(api, 'bills', paid_bill),
		transfer_bank_account: optionalRef(api, 'bank_accounts', transfer_bank_account),
		paid_user: optionalRef(api, 'users', paid_user),
		project: optionalRef(api, 'projects', project),
		...extra_fields,
	});
}

/** Build the attachment up front, so a bad file fails before anything is written to FreeAgent */
export async function prepareAttachment({files}: Config, file: AttachmentInput | undefined) {
	return file && buildAttachment(file, files);
}

/** Add an attachment to an explanation, returning the explanation's full attachment list */
export async function addAttachment(api: FreeAgentApi, explanationUrl: string, file: Awaited<ReturnType<typeof buildAttachment>>) {
	try {
		const {data} = await api.post<{attachments?: unknown[]}>(`${explanationUrl}/attachments`, {attachments: [file]}, {'X-Api-Version': ATTACHMENTS_API_VERSION});
		return data.attachments ?? [];
	} catch (err) {
		throw new Error(`The explanation ${explanationUrl} was saved, but attaching ${file.file_name} failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}
