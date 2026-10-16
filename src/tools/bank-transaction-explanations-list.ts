import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {
	dateRange, pagination, ref, updatedSince,
} from './schemas.js';
import {listOutputSchema, listResources} from '../utils/tools.js';

export function registerBankTransactionExplanationsList(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_explanations_list',
		{
			title: 'List bank transaction explanations',
			description: 'List explanations (how each bank transaction was categorised) on a bank account',
			inputSchema: {
				bank_account: ref('Bank account'),
				...dateRange,
				...updatedSince,
				...pagination,
			},
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page, bank_account, ...query}) => listResources(config.api, '/bank_transaction_explanations', 'bank_transaction_explanations', {...query, bank_account: config.api.resourceUrl('bank_accounts', bank_account)}, page, per_page),
	);
}
