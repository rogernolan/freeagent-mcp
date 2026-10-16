import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, idInput} from './schemas.js';
import {expenseBody, expenseFields} from './expense-fields.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerExpenseUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'expense_update',
		{
			title: 'Update expense',
			description: 'Update an expense claim. Only the fields you pass are changed',
			inputSchema: {
				...idInput('Expense'),
				...expenseFields,
				category: expenseFields.category.optional(),
				dated_on: expenseFields.dated_on.optional(),
				description: expenseFields.description.optional(),
				...extraFields,
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, idempotentHint: true},
		},
		async ({id, ...input}) => {
			const url = config.api.resourceUrl('expenses', id);
			await config.api.put(url, {expense: await expenseBody(config.api, input)});
			return getResource(config.api, url, 'expense');
		},
	);
}
