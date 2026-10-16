import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {deleteResource, resourceSchema} from '../utils/tools.js';

export function registerInvoiceDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_delete',
		{
			title: 'Delete invoice',
			description: 'Permanently delete an invoice. Prefer invoice_transition mark_as_cancelled for invoices that have been sent',
			inputSchema: idInput('Invoice'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, destructiveHint: true},
		},
		async ({id}) => deleteResource(config.api, config.api.resourceUrl('invoices', id)),
	);
}
