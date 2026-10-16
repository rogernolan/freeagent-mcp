import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {extraFields} from './schemas.js';
import {contactFields} from './contact-fields.js';
import {compact, resourceSchema, unwrap} from '../utils/tools.js';

export function registerContactCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_create',
		{
			title: 'Create contact',
			description: 'Create a client or supplier. Give either organisation_name, or first_name and last_name',
			inputSchema: {...contactFields, ...extraFields},
			outputSchema: resourceSchema,
			annotations: {readOnlyHint: false},
		},
		async ({extra_fields, ...fields}) => {
			const {data} = await config.api.post<Record<string, unknown>>('/contacts', {contact: {...compact(fields), ...extra_fields}});
			return unwrap(data, 'contact');
		},
	);
}
