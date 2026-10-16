import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {deleteResource, resourceSchema} from '../utils/tools.js';

export function registerBillDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'bill_delete',
		{
			title: 'Delete bill',
			description: 'Permanently delete a supplier bill',
			inputSchema: idInput('Bill'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, destructiveHint: true},
		},
		async ({id}) => deleteResource(config.api, config.api.resourceUrl('bills', id)),
	);
}
