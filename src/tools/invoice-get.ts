import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerInvoiceGet(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_get',
		{
			title: 'Get invoice',
			description: 'Get a single invoice with its line items, status, amounts due and payment details',
			inputSchema: idInput('Invoice'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('invoices', id), 'invoice'),
	);
}
