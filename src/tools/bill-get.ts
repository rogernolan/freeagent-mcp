import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerBillGet(server: McpServer, config: Config): void {
	server.registerTool(
		'bill_get',
		{
			title: 'Get bill',
			description: 'Get a single supplier bill with its line items, status, amount due and any attachment',
			inputSchema: idInput('Bill'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('bills', id), 'bill'),
	);
}
