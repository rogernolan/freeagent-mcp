import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, ref} from './schemas.js';
import {
	addAttachment, explanationBody, explanationFields, prepareAttachment,
} from './bank-transaction-explanation-fields.js';
import {
	compact, optionalRef, resourceSchema, unwrap,
} from '../utils/tools.js';
import {jsonResult} from '../utils/response.js';

export function registerBankTransactionExplanationCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_explanation_create',
		{
			title: 'Explain bank transaction',
			description: 'Reconcile a bank transaction by explaining what it was. Set exactly one of: '
				+ 'category (ordinary income/spending), paid_invoice (client paid an invoice), paid_bill (you paid a supplier bill), '
				+ 'transfer_bank_account (moved money between your accounts) or paid_user (payment to/from a director or employee). '
				+ 'Split a transaction by creating several explanations whose gross_values add up to the total. '
				+ 'Attach the receipt with `attachment`',
			inputSchema: {
				bank_transaction: ref('Bank transaction').optional().describe('The transaction to explain (ID or URL)'),
				bank_account: ref('Bank account').optional().describe('Instead of bank_transaction: create a new manual transaction on this account along with its explanation'),
				...explanationFields,
				...extraFields,
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false},
		},
		async ({bank_transaction, bank_account, attachment, ...input}) => {
			if (!bank_transaction === !bank_account) {
				throw new Error('Provide exactly one of bank_transaction or bank_account');
			}

			const file = await prepareAttachment(config, attachment);
			const explanation = {
				...compact({
					bank_transaction: optionalRef(config.api, 'bank_transactions', bank_transaction),
					bank_account: optionalRef(config.api, 'bank_accounts', bank_account),
				}),
				...explanationBody(config.api, input),
			};
			const {data} = await config.api.post<Record<string, unknown>>('/bank_transaction_explanations', {bank_transaction_explanation: explanation});
			const created = unwrap(data, 'bank_transaction_explanation').structuredContent;
			if (!file) {
				return jsonResult(created);
			}

			if (!created.url) {
				throw new Error('FreeAgent created the explanation but returned no URL, so the attachment was not added');
			}

			return jsonResult({...created, attachments: await addAttachment(config.api, config.api.resourceUrl('bank_transaction_explanations', created.url), file)});
		},
	);
}
