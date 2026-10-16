import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {deleteResource, resourceSchema} from '../utils/tools.js';

export function registerAttachmentDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'attachment_delete',
		{
			title: 'Delete attachment',
			description: 'Permanently delete an attachment from its bill, expense or explanation',
			inputSchema: idInput('Attachment'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, destructiveHint: true},
		},
		async ({id}) => deleteResource(config.api, config.api.resourceUrl('attachments', id)),
	);
}
