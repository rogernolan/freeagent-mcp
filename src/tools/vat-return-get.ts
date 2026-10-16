import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {date} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerVatReturnGet(server: McpServer, config: Config): void {
	server.registerTool(
		'vat_return_get',
		{
			title: 'Get VAT return',
			description: 'Get a VAT return, including the box-by-box breakdown',
			inputSchema: {
				period_ends_on: date.describe('The last day of the VAT period (YYYY-MM-DD), from vat_returns_list'),
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({period_ends_on}) => getResource(config.api, `/vat_returns/${period_ends_on}`, 'vat_return'),
	);
}
