import {readFile} from 'node:fs/promises';
import {basename, extname} from 'node:path';
import {z} from 'zod';
import type {FreeAgentApi, Query} from './freeagent-api.js';
import {pageInfo} from './freeagent-api.js';
import {jsonResult} from './response.js';

/** A FreeAgent resource. Only `url` is common to all; everything else is passed through untouched */
export const resourceSchema = z.looseObject({
	url: z.string().optional(),
});

export const listOutputSchema = z.object({
	items: z.array(resourceSchema),
	page: z.number(),
	per_page: z.number(),
	total_count: z.number().optional(),
	has_more: z.boolean().describe('Whether there is another page of results'),
});

type Resource = z.infer<typeof resourceSchema>;

/** GET a paginated collection and unwrap its root key, e.g. {invoices: [...]} */
export async function listResources(api: FreeAgentApi, path: string, rootKey: string, query: Query, page: number, perPage: number) {
	const {data, headers} = await api.get<Record<string, Resource[]>>(path, {...query, page, per_page: perPage});
	return jsonResult({
		items: data[rootKey] ?? [],
		...pageInfo(headers, page, perPage),
	});
}

/** Unwrap a single-resource response, e.g. {invoice: {...}} → {...} */
export function unwrap(data: Record<string, unknown>, rootKey: string) {
	const inner = data[rootKey];
	return jsonResult(resourceSchema.parse(inner && typeof inner === 'object' ? inner : data));
}

export async function getResource(api: FreeAgentApi, url: string, rootKey: string, query?: Query) {
	const {data} = await api.get<Record<string, unknown>>(url, query);
	return unwrap(data, rootKey);
}

export async function deleteResource(api: FreeAgentApi, url: string) {
	await api.delete(url);
	return jsonResult({success: true, deleted: url});
}

/** Drop undefined values so they aren't sent (and don't clear fields on update) */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
	return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Resolve an optional ID-or-URL argument to a full FreeAgent URL */
export function optionalRef(api: FreeAgentApi, collection: string, value: string | undefined): string | undefined {
	return value === undefined ? undefined : api.resourceUrl(collection, value);
}

const CONTENT_TYPES: Record<string, string> = {
	'.pdf': 'application/x-pdf',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type AttachmentInput = {
	data?: string | undefined;
	file_path?: string | undefined;
	file_name?: string | undefined;
	content_type?: string | undefined;
	description?: string | undefined;
};

/** Build FreeAgent's `attachment` object from base64 data or a local file */
export async function buildAttachment(input: AttachmentInput) {
	let {data} = input;
	let fileName = input.file_name;
	if (input.file_path) {
		const bytes = await readFile(input.file_path);
		if (bytes.length > MAX_ATTACHMENT_BYTES) {
			throw new Error(`Attachment ${input.file_path} is ${bytes.length} bytes; FreeAgent's limit is 5MB`);
		}

		data = bytes.toString('base64');
		fileName ??= basename(input.file_path);
	}

	if (!data) {
		throw new Error('Attachment needs either `data` (base64) or `file_path`');
	}

	if (!fileName) {
		throw new Error('Attachment needs a `file_name` when sending base64 `data`');
	}

	const contentType = input.content_type ?? CONTENT_TYPES[extname(fileName).toLowerCase()];
	if (!contentType) {
		throw new Error(`Can't infer content_type for ${fileName}; FreeAgent accepts PDF, PNG, JPEG and GIF`);
	}

	return compact({
		data,
		file_name: fileName,
		content_type: contentType,
		description: input.description,
	});
}
