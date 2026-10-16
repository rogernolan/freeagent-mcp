import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {pagination, ref} from './schemas.js';
import {listOutputSchema, listResources, optionalRef} from '../utils/tools.js';

export function registerProjectsList(server: McpServer, config: Config): void {
	server.registerTool(
		'projects_list',
		{
			title: 'List projects',
			description: 'List client projects. Projects can be referenced on invoices, bills, expenses and bank explanations',
			inputSchema: {
				view: z.enum(['active', 'completed', 'cancelled', 'hidden']).optional(),
				sort: z.enum(['name', '-name', 'contact_name', '-contact_name', 'created_at', '-created_at', 'updated_at', '-updated_at']).optional(),
				contact: ref('Contact').optional().describe('Only projects for this contact (ID or URL)'),
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, contact, ...query}) => listResources(config.api, '/projects', 'projects', {...query, contact: optionalRef(config.api, 'contacts', contact)}, page, per_page),
	);
}
