import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {pagination} from './schemas.js';
import {listOutputSchema, listResources} from '../utils/tools.js';

export function registerUsersList(server: McpServer, config: Config): void {
	server.registerTool(
		'users_list',
		{
			title: 'List users',
			description: 'List users (directors, employees, accountants) on the FreeAgent account',
			inputSchema: {
				view: z.enum(['all', 'staff', 'active_staff', 'advisors', 'active_advisors']).optional().describe('Defaults to all'),
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, ...query}) => listResources(config.api, '/users', 'users', query, page, per_page),
	);
}
