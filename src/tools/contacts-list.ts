import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {pagination, updatedSince} from './schemas.js';
import {listOutputSchema, listResources} from '../utils/tools.js';

export function registerContactsList(server: McpServer, config: Config): void {
	server.registerTool(
		'contacts_list',
		{
			title: 'List contacts',
			description: 'List clients and suppliers. Each contact\'s `url` is how invoices, bills and projects refer to it',
			inputSchema: {
				view: z.enum(['all', 'active', 'clients', 'suppliers', 'active_projects', 'completed_projects', 'open_clients', 'open_suppliers', 'hidden']).optional()
					.describe('Defaults to active. open_clients = clients with unpaid invoices; open_suppliers = suppliers with unpaid bills'),
				sort: z.enum(['name', '-name', 'created_at', '-created_at', 'updated_at', '-updated_at']).optional(),
				...updatedSince,
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, ...query}) => listResources(config.api, '/contacts', 'contacts', query, page, per_page),
	);
}
