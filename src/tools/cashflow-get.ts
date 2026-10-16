import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {date} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerCashflowGet(server: McpServer, config: Config): void {
	server.registerTool(
		'cashflow_get',
		{
			title: 'Get cashflow',
			description: 'Get money in and out per month across all bank accounts for a date range, with totals and net balance',
			inputSchema: {
				from_date: date.describe('Start date (YYYY-MM-DD)'),
				to_date: date.describe('End date (YYYY-MM-DD)'),
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async (query) => getResource(config.api, '/cashflow', 'cashflow', query),
	);
}
