import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields, idInput} from './schemas.js';
import {contactFields} from './contact-fields.js';
import {compact, getResource, resourceSchema} from '../utils/tools.js';

export function registerContactUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_update',
		{
			title: 'Update contact',
			description: 'Update a client or supplier. Only the fields you pass are changed',
			inputSchema: {...idInput('Contact'), ...contactFields, ...extraFields},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false, idempotentHint: true},
		},
		async ({id, extra_fields, ...fields}) => {
			const url = config.api.resourceUrl('contacts', id);
			await config.api.put(url, {contact: {...compact(fields), ...extra_fields}});
			return getResource(config.api, url, 'contact');
		},
	);
}
