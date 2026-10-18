import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields} from './schemas.js';
import {expenseBody, expenseFields} from './expense-fields.js';
import {resourceSchema, unwrap} from '../utils/tools.js';

export function registerExpenseCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'expense_create',
		{
			title: 'Create expense',
			description: 'Record an out-of-pocket expense claim, optionally with a receipt. '
				+ 'Remember gross_value is negative when the claimant paid (e.g. "-42.50")',
			inputSchema: {...expenseFields, ...extraFields},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false},
		},
		async (input) => {
			const user = input.user ?? (await config.api.get<{user: {url: string}}>('/users/me')).data.user.url;
			const expense = await expenseBody(config, {...input, user});
			const {data} = await config.api.post<Record<string, unknown>>('/expenses', {expense});
			return unwrap(data, 'expense');
		},
	);
}
