import {z} from 'zod';

// Shared input fields. FreeAgent's own snake_case names are used so tool arguments line up with its docs.

export const idInput = (resource: string) => ({
	id: z.string().describe(`${resource} ID (e.g. "123") or full FreeAgent URL`),
});

export const pagination = {
	page: z.number().int().min(1).default(1).describe('Page number, starting at 1'),
	per_page: z.number().int().min(1).max(100).default(25).describe('Results per page (max 100)'),
};

export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const dateRange = {
	from_date: date.optional().describe('Only include items dated on or after this date (YYYY-MM-DD)'),
	to_date: date.optional().describe('Only include items dated on or before this date (YYYY-MM-DD)'),
};

export const updatedSince = {
	updated_since: z.string().optional().describe('Only include items updated since this ISO 8601 timestamp, e.g. 2026-01-31T09:00:00Z'),
};

/** FreeAgent represents money as decimal strings; accepting strings avoids float rounding */
export const money = z.union([z.string().regex(/^-?\d+(\.\d+)?$/, 'Expected a decimal amount like "120.00"'), z.number()])
	.transform(String);

export const ref = (resource: string) => z.string().describe(`${resource} ID or full FreeAgent URL`);

export const salesTaxStatus = z.enum(['TAXABLE', 'EXEMPT', 'OUT_OF_SCOPE']);

export const attachment = z.object({
	data: z.string().optional().describe('Base64-encoded file content (max 5MB)'),
	file_path: z.string().optional().describe('Path to a local file to upload instead of `data` (only works when the server runs on your machine)'),
	file_name: z.string().optional().describe('File name, e.g. receipt.pdf. Defaults to the name of file_path'),
	content_type: z.enum(['image/png', 'image/x-png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/x-pdf']).optional()
		.describe('MIME type. Inferred from the file name if omitted'),
	description: z.string().optional(),
}).describe('File to attach, e.g. a receipt. Provide either `data` or `file_path`');

export const extraFields = {
	extra_fields: z.record(z.string(), z.unknown()).optional()
		.describe('Any other FreeAgent attributes to send as-is (see dev.freeagent.com/docs). Reference fields here must be full URLs'),
};
