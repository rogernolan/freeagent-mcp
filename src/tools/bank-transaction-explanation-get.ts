import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerBankTransactionExplanationGet(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_explanation_get',
		{
			title: 'Get bank transaction explanation',
			description: 'Get a single bank transaction explanation',
			inputSchema: idInput('Bank transaction explanation'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('bank_transaction_explanations', id), 'bank_transaction_explanation'),
	);
}
