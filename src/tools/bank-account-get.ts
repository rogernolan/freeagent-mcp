import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {idInput} from './schemas.js';
import {getResource, resourceSchema} from '../utils/tools.js';

export function registerBankAccountGet(server: McpServer, config: Config): void {
	server.registerTool(
		'bank_account_get',
		{
			title: 'Get bank account',
			description: 'Get a single bank account, including its current balance and latest activity date',
			inputSchema: idInput('Bank account'),
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: true},
		},
		async ({id}) => getResource(config.api, config.api.resourceUrl('bank_accounts', id), 'bank_account'),
	);
}
