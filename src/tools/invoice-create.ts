import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields} from './schemas.js';
import {invoiceFields, invoiceItemsBody} from './invoice-fields.js';
import {
	compact, optionalRef, resourceSchema, unwrap,
} from '../utils/tools.js';

export function registerInvoiceCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_create',
		{
			title: 'Create invoice',
			description: 'Create a sales invoice. It starts as a Draft; use invoice_transition to mark it as sent, or invoice_send_email to email it',
			inputSchema: {...invoiceFields, ...extraFields},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false},
		},
		async ({extra_fields, contact, project, invoice_items, ...fields}) => {
			const invoice = compact({
				...fields,
				contact: config.api.resourceUrl('contacts', contact),
				project: optionalRef(config.api, 'projects', project),
				invoice_items: invoiceItemsBody(config.api, invoice_items),
				...extra_fields,
			});
			const {data} = await config.api.post<Record<string, unknown>>('/invoices', {invoice});
			return unwrap(data, 'invoice');
		},
	);
}
