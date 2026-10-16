import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields} from './schemas.js';
import {billFields, billItemsBody} from './bill-fields.js';
import {
	buildAttachment, compact, resourceSchema, unwrap,
} from '../utils/tools.js';

export function registerBillCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'bill_create',
		{
			title: 'Create bill',
			description: 'Record a supplier bill (purchase invoice), optionally attaching the supplier\'s PDF. '
				+ 'Pay it later by explaining the bank transaction with bank_transaction_explanation_create paid_bill',
			inputSchema: {...billFields, ...extraFields},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false},
		},
		async ({extra_fields, contact, bill_items, attachment, ...fields}) => {
			const bill = compact({
				...fields,
				contact: config.api.resourceUrl('contacts', contact),
				bill_items: billItemsBody(config.api, bill_items),
				attachment: attachment && await buildAttachment(attachment),
				...extra_fields,
			});
			const {data} = await config.api.post<Record<string, unknown>>('/bills', {bill});
			return unwrap(data, 'bill');
		},
	);
}
