import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {resourceSchema} from '../utils/tools.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	items: z.array(resourceSchema),
});

export function registerCompanyTaxTimelineGet(server: McpServer, config: Config): void {
	server.registerTool(
		'company_tax_timeline_get',
		{
			title: 'Get tax timeline',
			description: 'Get upcoming tax deadlines and amounts due (VAT, corporation tax, self assessment, payroll)',
			inputSchema: {},
			outputSchema,
			annotations: {readOnlyHint: true},
		},
		async () => {
			const {data} = await config.api.get<{timeline_items?: unknown[]}>('/company/tax_timeline');
			return jsonResult(outputSchema.parse({items: data.timeline_items ?? []}));
		},
	);
}
