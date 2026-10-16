import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {compact, resourceSchema} from '../utils/tools.js';
import {jsonResult} from '../utils/response.js';

export function registerInvoiceSendEmail(server: McpServer, config: Config): void {
	server.registerTool(
		'invoice_send_email',
		{
			title: 'Email invoice',
			description: 'Email an invoice to the client from FreeAgent and mark it as sent. This sends a real email, so confirm the recipient and wording with the user first. '
				+ 'Set use_template to use the account\'s saved invoice email template instead of subject/body',
			inputSchema: {
				...idInput('Invoice'),
				to: z.string().optional().describe('Recipient address(es), comma separated. Defaults to the contact\'s billing email'),
				from: z.string().optional().describe('Sender address, which must be a verified email on the FreeAgent account'),
				subject: z.string().optional(),
				body: z.string().optional(),
				use_template: z.boolean().optional(),
				email_to_sender: z.boolean().optional().describe('Also send a copy to the sender'),
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, openWorldHint: true},
		},
		async ({id, ...email}) => {
			const url = config.api.resourceUrl('invoices', id);
			await config.api.post(`${url}/send_email`, {invoice: {email: compact(email)}});
			return jsonResult({success: true, message: `Invoice ${url} emailed`});
		},
	);
}
