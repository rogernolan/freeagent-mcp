import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {date} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerBalanceSheetGet(server: McpServer, config: Config): void {
	server.registerTool(
		'balance_sheet_get',
		{
			title: 'Get balance sheet',
			description: 'Get the balance sheet: capital assets, current assets and liabilities, and owners\' equity',
			inputSchema: {
				as_at_date: date.optional().describe('Balance sheet date (YYYY-MM-DD). Defaults to today'),
				opening_balances: z.boolean().optional().describe('Return the opening balances instead (as_at_date is ignored)'),
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({as_at_date, opening_balances}) => (opening_balances
			? getResource(config.api, '/accounting/balance_sheet/opening_balances', 'balance_sheet')
			: getResource(config.api, '/accounting/balance_sheet', 'balance_sheet', {as_at_date})),
	);
}
