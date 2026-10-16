import {z} from 'zod';
import type {FreeAgentApi} from '../utils/freeagent-api.js';
import {compact, optionalRef} from '../utils/tools.js';
import {
	attachment, date, money, ref, salesTaxStatus,
} from './schemas.js';

export const billItem = z.object({
	url: z.string().optional().describe('Existing bill item URL (from bill_get). Only needed on update, to change or remove that item'),
	_destroy: z.boolean().optional().describe('On update, set true (with url) to remove the item'),
	category: ref('Spending category (nominal code, e.g. "285")').optional().describe('Required for new items'),
	description: z.string().optional(),
	total_value: money.optional().describe('Amount including VAT, e.g. "120.00". Give this or total_value_ex_tax'),
	total_value_ex_tax: money.optional().describe('Amount excluding VAT'),
	sales_tax_rate: money.optional().describe('VAT rate as a percentage, e.g. "20.0"'),
	sales_tax_status: salesTaxStatus.optional(),
	manual_sales_tax_amount: money.optional().describe('Override the calculated VAT amount'),
	quantity: money.optional(),
	unit: z.string().optional().describe('e.g. Hours, Products, Stock'),
	project: ref('Project').optional(),
});

export const billFields = {
	contact: ref('Supplier contact'),
	reference: z.string().describe('The supplier\'s invoice number'),
	dated_on: date.describe('Bill date (YYYY-MM-DD)'),
	due_on: date.optional().describe('Due date (YYYY-MM-DD)'),
	currency: z.string().optional().describe('ISO code, e.g. "GBP"'),
	comments: z.string().optional(),
	bill_items: z.array(billItem).max(40).describe('Line items (max 40)'),
	attachment: attachment.optional(),
};

export function billItemsBody(api: FreeAgentApi, items: z.infer<typeof billItem>[] | undefined) {
	return items?.map(({_destroy, category, project, ...item}) => compact({
		...item,
		_destroy: _destroy ? 1 : undefined,
		category: optionalRef(api, 'categories', category),
		project: optionalRef(api, 'projects', project),
	}));
}
