import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerCategoriesList(server: McpServer, config: Config): void {
	server.registerTool(
		'categories_list',
		{
			title: 'List accounting categories',
			description: 'List the chart of accounts, grouped into admin_expenses_categories, cost_of_sales_categories, income_categories and general_categories. '
				+ 'Use a category\'s nominal_code (e.g. "285") or url wherever a tool asks for a category',
			inputSchema: {
				sub_accounts: z.boolean().optional().describe('Include sub accounts (e.g. "602-1") instead of their top-level accounts'),
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({sub_accounts}) => getResource(config.api, '/categories', '', {sub_accounts}),
	);
}
