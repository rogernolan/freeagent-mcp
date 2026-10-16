import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerContactGet(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_get',
		{
			title: 'Get contact',
			description: 'Get a single client or supplier',
			inputSchema: idInput('Contact'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('contacts', id), 'contact'),
	);
}
