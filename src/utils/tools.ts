import {basename, extname} from 'node:path';
import {z} from 'zod';
import type {FreeAgentApi, Query} from './freeagent-api.js';
import {pageInfo} from './freeagent-api.js';
import {type FileAccess, NO_FILE_ACCESS, readAllowedFile} from './files.js';
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

const startsWith = (bytes: Buffer, signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
const PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const JPEG = [0xFF, 0xD8, 0xFF];

/** Checks the bytes really are the declared type, so e.g. a private key can't be uploaded labelled as a PDF */
const SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
	// The PDF header may follow up to 1KB of junk
	'application/x-pdf': (bytes) => bytes.subarray(0, 1024).includes('%PDF-'),
	'image/png': (bytes) => startsWith(bytes, PNG),
	'image/x-png': (bytes) => startsWith(bytes, PNG),
	'image/jpeg': (bytes) => startsWith(bytes, JPEG),
	'image/jpg': (bytes) => startsWith(bytes, JPEG),
	'image/gif': (bytes) => ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('latin1')),
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type AttachmentInput = {
	data?: string | undefined;
	file_path?: string | undefined;
	file_name?: string | undefined;
	content_type?: string | undefined;
	description?: string | undefined;
};

/** Build FreeAgent's `attachment` object from base64 data or a local file inside the allowed folders */
export async function buildAttachment(input: AttachmentInput, access: FileAccess = NO_FILE_ACCESS) {
	if (input.file_path && input.data) {
		throw new Error('Attachment takes either `data` or `file_path`, not both');
	}

	let bytes: Buffer;
	let fileName = input.file_name;
	if (input.file_path) {
		bytes = await readAllowedFile(input.file_path, access, MAX_ATTACHMENT_BYTES);
		fileName ??= basename(input.file_path);
	} else if (input.data) {
		bytes = Buffer.from(input.data, 'base64');
		if (bytes.length > MAX_ATTACHMENT_BYTES) {
			throw new Error(`Attachment is ${bytes.length} bytes; FreeAgent's limit is 5MB`);
		}
	} else {
		throw new Error('Attachment needs either `data` (base64) or `file_path`');
	}

	if (!fileName) {
		throw new Error('Attachment needs a `file_name` when sending base64 `data`');
	}

	const contentType = input.content_type ?? CONTENT_TYPES[extname(fileName).toLowerCase()];
	const matches = contentType === undefined ? undefined : SIGNATURES[contentType];
	if (!contentType || !matches) {
		throw new Error(`Can't infer content_type for ${fileName}; FreeAgent accepts PDF, PNG, JPEG and GIF`);
	}

	if (!matches(bytes)) {
		throw new Error(`${fileName} is not a valid ${contentType} file`);
	}

	return compact({
		data: bytes.toString('base64'),
		file_name: fileName,
		content_type: contentType,
		description: input.description,
	});
}
