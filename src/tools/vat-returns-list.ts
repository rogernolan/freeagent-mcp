import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {pagination} from './schemas.js';
import {listOutputSchema, listResources} from '../utils/tools.js';

export function registerVatReturnsList(server: McpServer, config: Config): void {
	server.registerTool(
		'vat_returns_list',
		{
			title: 'List VAT returns',
			description: 'List VAT return periods with filing status, due dates and payments due',
			inputSchema: pagination,
			outputSchema: listOutputSchema,
			annotations: {readOnlyHint: true},
		},
		async ({page, per_page}) => listResources(config.api, '/vat_returns', 'vat_returns', {}, page, per_page),
	);
}
