import {z} from 'zod';
import type {FreeAgentApi} from '../utils/freeagent-api.js';
import {buildAttachment, compact, optionalRef} from '../utils/tools.js';
import {
	attachment, date, money, ref, salesTaxStatus,
} from './schemas.js';

export const expenseFields = {
	user: ref('User who paid (claimant)').optional().describe('User ID or URL of the claimant. Defaults to the authenticated user'),
	category: ref('Spending category (nominal code, e.g. "285" for Accommodation and Meals)'),
	dated_on: date.describe('Date of the expense (YYYY-MM-DD)'),
	description: z.string(),
	gross_value: money.optional().describe('Total including VAT. NEGATIVE for money the claimant spent and is owed back (the usual case), e.g. "-42.50"; positive for a refund to the company. Not used for mileage'),
	sales_tax_rate: money.optional().describe('VAT rate as a percentage, e.g. "20.0"'),
	sales_tax_status: salesTaxStatus.optional(),
	manual_sales_tax_amount: money.optional().describe('Reclaimable VAT amount, overriding the calculated value. Use this for foreign-currency expenses'),
	currency: z.string().optional().describe('ISO code if not the company currency, e.g. "EUR"'),
	project: ref('Project').optional(),
	mileage: money.optional().describe('Miles travelled, for mileage claims'),
	attachment: attachment.optional().describe('Receipt to attach. Provide either `data` (base64) or `file_path`'),
};

type ExpenseInput = {
	[key: string]: unknown;
	user?: string | undefined;
	category?: string | undefined;
	project?: string | undefined;
	attachment?: Parameters<typeof buildAttachment>[0] | undefined;
	extra_fields?: Record<string, unknown> | undefined;
};

export async function expenseBody(api: FreeAgentApi, {
	user, category, project, attachment: file, extra_fields, ...fields
}: ExpenseInput) {
	return compact({
		...fields,
		user: optionalRef(api, 'users', user),
		category: optionalRef(api, 'categories', category),
		project: optionalRef(api, 'projects', project),
		attachment: file && await buildAttachment(file),
		...extra_fields,
	});
}
