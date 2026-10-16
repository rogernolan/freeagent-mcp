import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {
	dateRange, pagination, ref, updatedSince,
} from './schemas.js';
import {listOutputSchema, listResources, optionalRef} from '../utils/tools.js';

export function registerBillsList(server: McpServer, config: Config): void {
	server.registerTool(
		'bills_list',
		{
			title: 'List bills',
			description: 'List supplier bills (purchase invoices). Use view=open_or_overdue to find bills still to pay',
			inputSchema: {
				view: z.enum(['all', 'open', 'overdue', 'open_or_overdue', 'open_or_overdue_payments', 'open_or_overdue_refunds', 'paid', 'recurring', 'hire_purchase', 'cis']).optional()
					.describe('Defaults to all'),
				contact: ref('Contact').optional().describe('Only bills from this supplier (ID or URL)'),
				project: ref('Project').optional().describe('Only bills for this project (ID or URL)'),
				nested_bill_items: z.boolean().optional().describe('Include line items in each bill'),
				...dateRange,
				...updatedSince,
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, contact, project, ...query}) => listResources(config.api, '/bills', 'bills', {...query, contact: optionalRef(config.api, 'contacts', contact), project: optionalRef(config.api, 'projects', project)}, page, per_page),
	);
}
