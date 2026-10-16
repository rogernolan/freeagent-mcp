import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {pagination, ref, updatedSince} from './schemas.js';
import {listOutputSchema, listResources, optionalRef} from '../utils/tools.js';

export function registerInvoicesList(server: McpServer, config: Config): void {
	server.registerTool(
		'invoices_list',
		{
			title: 'List invoices',
			description: 'List sales invoices. Use view=open_or_overdue to find unpaid invoices, or view=overdue to chase late payers',
			inputSchema: {
				view: z.string().optional().describe('One of all (default), recent_open_or_overdue, open, overdue, open_or_overdue, draft, paid, scheduled_to_email, thank_you_emails, reminder_emails, or last_N_months (e.g. last_3_months)'),
				sort: z.enum(['created_at', '-created_at', 'updated_at', '-updated_at']).optional(),
				contact: ref('Contact').optional().describe('Only invoices for this contact (ID or URL)'),
				project: ref('Project').optional().describe('Only invoices for this project (ID or URL)'),
				nested_invoice_items: z.boolean().optional().describe('Include line items in each invoice'),
				...updatedSince,
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, contact, project, ...query}) => listResources(config.api, '/invoices', 'invoices', {...query, contact: optionalRef(config.api, 'contacts', contact), project: optionalRef(config.api, 'projects', project)}, page, per_page),
	);
}
