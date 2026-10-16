import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {dateRange} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerProfitAndLossGet(server: McpServer, config: Config): void {
	server.registerTool(
		'profit_and_loss_get',
		{
			title: 'Get profit and loss',
			description: 'Get a profit and loss summary: income, expenses, operating profit, deductions (e.g. corporation tax) and retained profit. '
				+ 'Defaults to the current accounting year to date. Periods must be 12 months or less, or within one accounting year',
			inputSchema: {
				...dateRange,
				accounting_period: z.string().regex(/^\d{4}\/\d{2}$/).optional().describe('Whole accounting year instead of dates, e.g. "2025/26"'),
			},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async (query) => getResource(config.api, '/accounting/profit_and_loss/summary', 'profit_and_loss_summary', query),
	);
}
