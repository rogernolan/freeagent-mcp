import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {pagination} from './schemas.js';
import {listOutputSchema, listResources} from '../utils/tools.js';

export function registerBankAccountsList(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_accounts_list',
		{
			title: 'List bank accounts',
			description: 'List bank, credit card and PayPal accounts with their current balances. Each has a `url` needed for bank transaction tools',
			inputSchema: {
				view: z.enum(['standard_bank_accounts', 'credit_card_accounts', 'paypal_accounts']).optional().describe('Defaults to all account types'),
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, ...query}) => listResources(config.api, '/bank_accounts', 'bank_accounts', query, page, per_page),
	);
}
