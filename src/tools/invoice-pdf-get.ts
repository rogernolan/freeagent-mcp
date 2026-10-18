import {writeFile} from 'node:fs/promises';
import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {allowedSavePath, NO_FILE_ACCESS} from '../utils/files.js';

export function registerInvoicePdfGet(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_pdf_get',
		{
			title: 'Download invoice PDF',
			description: 'Get an invoice as a PDF, returned as an embedded resource, or saved to a local file if save_to is given',
			inputSchema: {
				...idInput('Invoice'),
				save_to: z.string().optional().describe('File name (or path) inside FREEAGENT_DOWNLOAD_DIR to save the PDF to, e.g. "INV-042.pdf". Existing files are never overwritten'),
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
				const path = await allowedSavePath(save_to, config.files ?? NO_FILE_ACCESS, '.pdf');
				// 'wx' never overwrites an existing file
				await writeFile(path, Buffer.from(content, 'base64'), {flag: 'wx'});
				return {content: [{type: 'text' as const, text: `Saved invoice PDF to ${path}`}]};
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
