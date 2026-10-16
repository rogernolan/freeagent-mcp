import {z} from 'zod';
import type {FreeAgentApi} from '../utils/freeagent-api.js';
import {compact, optionalRef} from '../utils/tools.js';
import {
	date, money, ref, salesTaxStatus,
} from './schemas.js';

export const invoiceItem = z.object({
	id: z.string().optional().describe('Existing item ID or URL. Only needed on update, to change or remove that item'),
	_destroy: z.boolean().optional().describe('On update, set true (with id) to remove the item'),
	description: z.string().optional().describe('Required for new items'),
	item_type: z.enum(['Hours', 'Days', 'Weeks', 'Months', 'Years', 'Products', 'Services', 'Training', 'Expenses', 'Comment', 'Bills', 'Discount', 'Credit', 'VAT', 'Stock']).optional()
		.describe('Unit of quantity. Defaults to Hours in FreeAgent'),
	quantity: money.optional().describe('Defaults to 0'),
	price: money.optional().describe('Unit price excluding VAT, e.g. "450.00"'),
	sales_tax_rate: money.optional().describe('VAT rate as a percentage, e.g. "20.0"'),
	sales_tax_status: salesTaxStatus.optional(),
	category: ref('Income category (nominal code, e.g. "001")').optional(),
	project: ref('Project').optional(),
});

export const invoiceFields = {
	contact: ref('Contact'),
	dated_on: date.describe('Invoice date (YYYY-MM-DD)'),
	payment_terms_in_days: z.number().int().min(0).describe('Days until due, e.g. 30'),
	reference: z.string().optional().describe('Invoice number. Auto-generated if omitted'),
	currency: z.string().optional().describe('ISO code, e.g. "GBP". Defaults to the contact\'s or company\'s currency'),
	project: ref('Project').optional(),
	comments: z.string().optional().describe('Notes shown on the invoice'),
	po_reference: z.string().optional().describe('Client\'s purchase order reference'),
	invoice_items: z.array(invoiceItem).optional(),
};

export function invoiceItemsBody(api: FreeAgentApi, items: z.infer<typeof invoiceItem>[] | undefined) {
	return items?.map(({id, _destroy, category, project, ...item}) => compact({
		...item,
		// FreeAgent identifies invoice items by numeric ID in the payload
		id: id === undefined ? undefined : api.resourceUrl('invoice_items', id).split('/').pop(),
		_destroy: _destroy ? 1 : undefined,
		category: optionalRef(api, 'categories', category),
		project: optionalRef(api, 'projects', project),
	}));
}
