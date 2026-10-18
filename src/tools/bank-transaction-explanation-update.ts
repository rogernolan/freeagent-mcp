import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, idInput} from './schemas.js';
import {
	addAttachment, explanationBody, explanationFields, prepareAttachment,
} from './bank-transaction-explanation-fields.js';
import {getResource, resourceSchema} from '../utils/tools.js';
import {jsonResult} from '../utils/response.js';

export function registerBankTransactionExplanationUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_explanation_update',
		{
			title: 'Update bank transaction explanation',
			description: 'Change how a bank transaction is explained, e.g. recategorise it, or add a receipt to an already-explained transaction. '
				+ 'Only the fields you pass are changed. `attachment` is added alongside any existing attachments',
			inputSchema: {
				...idInput('Bank transaction explanation'),
				...explanationFields,
				...extraFields,
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, idempotentHint: true},
		},
		async ({id, attachment, ...input}) => {
			const url = config.api.resourceUrl('bank_transaction_explanations', id);
			const file = await prepareAttachment(config, attachment);
			const changes = explanationBody(config.api, input);
			if (Object.keys(changes).length > 0 || !file) {
				await config.api.put(url, {bank_transaction_explanation: changes});
			}

			const attachments = file && await addAttachment(config.api, url, file);
			const updated = (await getResource(config.api, url, 'bank_transaction_explanation')).structuredContent;
			return jsonResult(attachments ? {...updated, attachments} : updated);
		},
	);
}
