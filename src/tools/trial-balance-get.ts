import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {dateRange} from './schemas.js';
import {resourceSchema} from '../utils/tools.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	items: z.array(resourceSchema),
});

export function registerTrialBalanceGet(server: McpServer, config: Config): void {
	server.registerTool(
		'trial_balance_get',
		{
			title: 'Get trial balance',
			description: 'Get the trial balance: the total for every nominal account. With only to_date, covers the accounting period containing that date up to to_date. '
				+ 'With no dates, as at today',
			inputSchema: {
				...dateRange,
				opening_balances: z.boolean().optional().describe('Return the opening balances instead (dates are ignored)'),
			},
			outputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({opening_balances, ...query}) => {
			const {data} = opening_balances
				? await config.api.get<{trial_balance_summary?: unknown[]}>('/accounting/trial_balance/summary/opening_balances')
				: await config.api.get<{trial_balance_summary?: unknown[]}>('/accounting/trial_balance/summary', query);
			return jsonResult(outputSchema.parse({items: data.trial_balance_summary ?? []}));
		},
	);
}
