import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {
	dateRange, pagination, ref, updatedSince,
} from './schemas.js';
import {listOutputSchema, listResources} from '../utils/tools.js';

export function registerBankTransactionsList(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transactions_list',
		{
			title: 'List bank transactions',
			description: 'List transactions on a bank account. Use view=unexplained to find transactions that still need reconciling, '
				+ 'then explain them with bank_transaction_explanation_create',
			inputSchema: {
				bank_account: ref('Bank account'),
				view: z.enum(['all', 'unexplained', 'explained', 'manual', 'imported', 'marked_for_review']).optional().describe('Defaults to all'),
				last_uploaded: z.boolean().optional().describe('Only transactions from the most recently uploaded statement'),
				...dateRange,
				...updatedSince,
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, bank_account, ...query}) => listResources(config.api, '/bank_transactions', 'bank_transactions', {...query, bank_account: config.api.resourceUrl('bank_accounts', bank_account)}, page, per_page),
	);
}
