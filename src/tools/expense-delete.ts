import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {deleteResource, resourceSchema} from '../utils/tools.js';

export function registerExpenseDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'expense_delete',
		{
			title: 'Delete expense',
			description: 'Permanently delete an expense claim',
			inputSchema: idInput('Expense'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, destructiveHint: true},
		},
		async ({id}) => deleteResource(config.api, config.api.resourceUrl('expenses', id)),
	);
}
