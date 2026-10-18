import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, idInput} from './schemas.js';
import {billFields, billItemsBody} from './bill-fields.js';
import {
	buildAttachment, compact, getResource, optionalRef, resourceSchema,
} from '../utils/tools.js';

export function registerBillUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'bill_update',
		{
			title: 'Update bill',
			description: 'Update a supplier bill. Only the fields you pass are changed. To edit a line item pass its url; to remove one pass url and _destroy: true; items without a url are added',
			inputSchema: {
				...idInput('Bill'),
				contact: billFields.contact.optional(),
				reference: billFields.reference.optional(),
				dated_on: billFields.dated_on.optional(),
				due_on: billFields.due_on,
				currency: billFields.currency,
				comments: billFields.comments,
				bill_items: billFields.bill_items.optional(),
				attachment: billFields.attachment,
				...extraFields,
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, idempotentHint: true},
		},
		async ({id, extra_fields, contact, bill_items, attachment, ...fields}) => {
			const url = config.api.resourceUrl('bills', id);
			const bill = compact({
				...fields,
				contact: optionalRef(config.api, 'contacts', contact),
				bill_items: billItemsBody(config.api, bill_items),
				attachment: attachment && await buildAttachment(attachment, config.files),
				...extra_fields,
			});
			await config.api.put(url, {bill});
			return getResource(config.api, url, 'bill');
		},
	);
}
