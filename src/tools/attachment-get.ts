import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerAttachmentGet(server: McpServer, config: Config): void {
	server.registerTool(
		'attachment_get',
		{
			title: 'Get attachment',
			description: 'Get an attachment (receipt or bill PDF) including a temporary content_src download URL, valid until expires_at',
			inputSchema: idInput('Attachment'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('attachments', id), 'attachment'),
	);
}
