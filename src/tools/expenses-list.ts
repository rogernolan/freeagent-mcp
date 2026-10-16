import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {
	dateRange, pagination, ref, updatedSince,
} from './schemas.js';
import {listOutputSchema, listResources, optionalRef} from '../utils/tools.js';

export function registerExpensesList(server: McpServer, config: Config): void {
	server.registerTool(
		'expenses_list',
		{
			title: 'List expenses',
			description: 'List out-of-pocket expense claims',
			inputSchema: {
				view: z.enum(['recent', 'recurring']).optional(),
				project: ref('Project').optional().describe('Only expenses for this project (ID or URL)'),
				...dateRange,
				...updatedSince,
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, project, ...query}) => listResources(config.api, '/expenses', 'expenses', {...query, project: optionalRef(config.api, 'projects', project)}, page, per_page),
	);
}
