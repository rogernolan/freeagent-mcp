import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {deleteResource, resourceSchema} from '../utils/tools.js';

export function registerBankTransactionExplanationDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_explanation_delete',
		{
			title: 'Delete bank transaction explanation',
			description: 'Delete an explanation, returning that part of the bank transaction to unexplained',
			inputSchema: idInput('Bank transaction explanation'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, destructiveHint: true},
		},
		async ({id}) => deleteResource(config.api, config.api.resourceUrl('bank_transaction_explanations', id)),
	);
}
