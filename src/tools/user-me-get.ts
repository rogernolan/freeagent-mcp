import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerUserMeGet(server: McpServer, config: Config): void {
	server.registerTool(
		'user_me_get',
		{
			title: 'Get current user',
			description: 'Get the FreeAgent user this server is authenticated as, including their `url` (needed when creating expenses) and permission level',
			inputSchema: {},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async () => getResource(config.api, '/users/me', 'user'),
	);
}
