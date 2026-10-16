import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, ref} from './schemas.js';
import {explanationBody, explanationFields} from './bank-transaction-explanation-fields.js';
import {
	compact, optionalRef, resourceSchema, unwrap,
} from '../utils/tools.js';

export function registerBankTransactionExplanationCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_transaction_explanation_create',
		{
			title: 'Explain bank transaction',
			description: 'Reconcile a bank transaction by explaining what it was. Set exactly one of: '
				+ 'category (ordinary income/spending), paid_invoice (client paid an invoice), paid_bill (you paid a supplier bill), '
				+ 'transfer_bank_account (moved money between your accounts) or paid_user (payment to/from a director or employee). '
				+ 'Split a transaction by creating several explanations whose gross_values add up to the total',
			inputSchema: {
				bank_transaction: ref('Bank transaction').optional().describe('The transaction to explain (ID or URL)'),
				bank_account: ref('Bank account').optional().describe('Instead of bank_transaction: create a new manual transaction on this account along with its explanation'),
				...explanationFields,
				...extraFields,
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false},
		},
		async ({bank_transaction, bank_account, ...input}) => {
			if (!bank_transaction === !bank_account) {
				throw new Error('Provide exactly one of bank_transaction or bank_account');
			}

			const explanation = {
				...compact({
					bank_transaction: optionalRef(config.api, 'bank_transactions', bank_transaction),
					bank_account: optionalRef(config.api, 'bank_accounts', bank_account),
				}),
				...explanationBody(config.api, input),
			};
			const {data} = await config.api.post<Record<string, unknown>>('/bank_transaction_explanations', {bank_transaction_explanation: explanation});
			return unwrap(data, 'bank_transaction_explanation');
		},
	);
}
