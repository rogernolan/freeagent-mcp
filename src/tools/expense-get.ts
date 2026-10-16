import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerExpenseGet(server: McpServer, config: Config): void {
	server.registerTool(
		'expense_get',
		{
			title: 'Get expense',
			description: 'Get a single expense claim, including any attached receipt',
			inputSchema: idInput('Expense'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('expenses', id), 'expense'),
	);
}
