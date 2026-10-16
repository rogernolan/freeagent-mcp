import {writeFile} from 'node:fs/promises';
import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';

export function registerInvoicePdfGet(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_pdf_get',
		{
			title: 'Download invoice PDF',
			description: 'Get an invoice as a PDF, returned as an embedded resource, or saved to a local file if save_to is given',
			inputSchema: {
				...idInput('Invoice'),
				save_to: z.string().optional().describe('Local path to write the PDF to (only works when the server runs on your machine)'),
			},
			annotations: {readOnlyHint: true},
		},
		async ({id, save_to}) => {
			const url = config.api.resourceUrl('invoices', id);
			const {data} = await config.api.get<{pdf?: {content?: string}}>(`${url}/pdf`);
			const content = data.pdf?.content;
			if (!content) {
				throw new Error('FreeAgent returned no PDF content');
			}

			if (save_to) {
				await writeFile(save_to, Buffer.from(content, 'base64'));
				return {content: [{type: 'text' as const, text: `Saved invoice PDF to ${save_to}`}]};
			}

			return {
				content: [{
					type: 'resource' as const,
					resource: {uri: `${url}/pdf`, mimeType: 'application/pdf', blob: content},
				}],
			};
		},
	);
}
