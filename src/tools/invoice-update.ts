import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, idInput} from './schemas.js';
import {invoiceFields, invoiceItemsBody} from './invoice-fields.js';
import {
	compact, getResource, optionalRef, resourceSchema,
} from '../utils/tools.js';

export function registerInvoiceUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_update',
		{
			title: 'Update invoice',
			description: 'Update an invoice. Only the fields you pass are changed. To edit a line item pass its id; to remove one pass id and _destroy: true; items without an id are added',
			inputSchema: {
				...idInput('Invoice'),
				contact: invoiceFields.contact.optional(),
				dated_on: invoiceFields.dated_on.optional(),
				payment_terms_in_days: invoiceFields.payment_terms_in_days.optional(),
				reference: invoiceFields.reference,
				currency: invoiceFields.currency,
				project: invoiceFields.project,
				comments: invoiceFields.comments,
				po_reference: invoiceFields.po_reference,
				invoice_items: invoiceFields.invoice_items,
				...extraFields,
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, idempotentHint: true},
		},
		async ({id, extra_fields, contact, project, invoice_items, ...fields}) => {
			const url = config.api.resourceUrl('invoices', id);
			const invoice = compact({
				...fields,
				contact: optionalRef(config.api, 'contacts', contact),
				project: optionalRef(config.api, 'projects', project),
				invoice_items: invoiceItemsBody(config.api, invoice_items),
				...extra_fields,
			});
			await config.api.put(url, {invoice});
			return getResource(config.api, url, 'invoice');
		},
	);
}
