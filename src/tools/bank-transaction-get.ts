import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerBankTransactionGet(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_get',
		{
			title: 'Get bank transaction',
			description: 'Get a single bank transaction, including its unexplained_amount and any explanations',
			inputSchema: idInput('Bank transaction'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('bank_transactions', id), 'bank_transaction'),
	);
}
