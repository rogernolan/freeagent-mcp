import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, idInput} from './schemas.js';
import {explanationBody, explanationFields} from './bank-transaction-explanation-fields.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerBankTransactionExplanationUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_explanation_update',
		{
			title: 'Update bank transaction explanation',
			description: 'Change how a bank transaction is explained, e.g. recategorise it. Only the fields you pass are changed',
			inputSchema: {
				...idInput('Bank transaction explanation'),
				...explanationFields,
				...extraFields,
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, idempotentHint: true},
		},
		async ({id, ...input}) => {
			const url = config.api.resourceUrl('bank_transaction_explanations', id);
			await config.api.put(url, {bank_transaction_explanation: explanationBody(config.api, input)});
			return getResource(config.api, url, 'bank_transaction_explanation');
		},
	);
}
