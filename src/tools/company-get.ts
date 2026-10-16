import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerCompanyGet(server: McpServer, config: Config): void {
	server.registerTool(
		'company_get',
		{
			title: 'Get company',
			description: 'Get the FreeAgent company: name, type, currency, start dates, accounting year end and VAT registration',
			inputSchema: {},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async () => getResource(config.api, '/company', 'company'),
	);
}
