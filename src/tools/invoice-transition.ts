import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerInvoiceTransition(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_transition',
		{
			title: 'Change invoice status',
			description: 'Change an invoice\'s status without emailing it. mark_as_sent also re-opens a cancelled invoice. '
				+ 'convert_to_credit_note works only on draft invoices with a negative total',
			inputSchema: {
				...idInput('Invoice'),
				transition: z.enum(['mark_as_sent', 'mark_as_draft', 'mark_as_scheduled', 'mark_as_cancelled', 'convert_to_credit_note']),
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, idempotentHint: true},
		},
		async ({id, transition}) => {
			const url = config.api.resourceUrl('invoices', id);
			await config.api.put(`${url}/transitions/${transition}`);
			return getResource(config.api, url, 'invoice');
		},
	);
}
