import {
	mkdir, mkdtemp, readFile, realpath, rm, writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
	describe, test, expect, vi, beforeEach, afterEach,
} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from './index.js';
import {FreeAgentApi} from './utils/freeagent-api.js';
import {resolveToolSelection} from './tools/access.js';

const baseUrl = 'https://api.sandbox.freeagent.com/v2';

function json(body: unknown, headers: Record<string, string> = {}) {
	return new Response(JSON.stringify(body), {headers});
}

describe('MCP server (in-memory)', () => {
	let fetchFn: ReturnType<typeof vi.fn<typeof fetch>>;
	let client: Client;

	beforeEach(async () => {
		fetchFn = vi.fn<typeof fetch>();
		const api = new FreeAgentApi({
			baseUrl,
			tokens: {getAccessToken: async () => 'token', refreshAccessToken: async () => 'token'},
			userAgent: 'test',
			fetch: fetchFn,
		});
		const server = createServer({api, tools: resolveToolSelection('all')});
		const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);
		client = new Client({name: 'test', version: '0.0.0'});
		await client.connect(clientTransport);
	});

	function request(n: number) {
		const [url, init] = fetchFn.mock.calls[n]!;
		return {url: (url as URL).href, method: init?.method, body: init?.body ? JSON.parse(init.body as string) : undefined};
	}

	test('lists all tools with object input schemas and hints', async () => {
		const {tools} = await client.listTools();

		expect(tools).toHaveLength(45);
		for (const tool of tools) {
			expect(tool.inputSchema.type).toBe('object');
			expect(tool.description).toBeTruthy();
			expect(tool.annotations?.readOnlyHint).toBeTypeOf('boolean');
		}
	});

	test('paginates list tools', async () => {
		fetchFn.mockResolvedValueOnce(json(
			{contacts: [{url: `${baseUrl}/contacts/1`, organisation_name: 'Acme'}]},
			{'X-Total-Count': '51', Link: `<${baseUrl}/contacts?page=2>; rel="next"`},
		));

		const result = await client.callTool({name: 'contacts_list', arguments: {view: 'clients'}});

		expect(request(0).url).toBe(`${baseUrl}/contacts?view=clients&page=1&per_page=25`);
		expect(result.structuredContent).toEqual({
			items: [{url: `${baseUrl}/contacts/1`, organisation_name: 'Acme'}],
			page: 1,
			per_page: 25,
			total_count: 51,
			has_more: true,
		});
	});

	test('creates invoices with IDs expanded to FreeAgent URLs', async () => {
		fetchFn.mockResolvedValueOnce(json({invoice: {url: `${baseUrl}/invoices/9`, status: 'Draft'}}));

		const result = await client.callTool({
			name: 'invoice_create',
			arguments: {
				contact: '12',
				dated_on: '2026-10-16',
				payment_terms_in_days: 30,
				invoice_items: [{
					description: 'Consulting', item_type: 'Days', quantity: 2, price: '450.00', category: '001',
				}],
			},
		});

		expect(result.isError).toBeFalsy();
		expect(request(0)).toEqual({
			url: `${baseUrl}/invoices`,
			method: 'POST',
			body: {
				invoice: {
					dated_on: '2026-10-16',
					payment_terms_in_days: 30,
					contact: `${baseUrl}/contacts/12`,
					invoice_items: [{
						description: 'Consulting', item_type: 'Days', quantity: '2', price: '450.00', category: `${baseUrl}/categories/001`,
					}],
				},
			},
		});
		expect(result.structuredContent).toEqual({url: `${baseUrl}/invoices/9`, status: 'Draft'});
	});

	test('explains a bank transaction as an invoice payment', async () => {
		fetchFn.mockResolvedValueOnce(json({bank_transaction_explanation: {url: `${baseUrl}/bank_transaction_explanations/3`}}));

		await client.callTool({
			name: 'bank_transaction_explanation_create',
			arguments: {bank_transaction: '77', paid_invoice: '9', gross_value: '900.00'},
		});

		expect(request(0).body).toEqual({
			bank_transaction_explanation: {
				bank_transaction: `${baseUrl}/bank_transactions/77`,
				gross_value: '900.00',
				paid_invoice: `${baseUrl}/invoices/9`,
			},
		});
	});

	test('defaults the expense claimant to the current user', async () => {
		fetchFn
			.mockResolvedValueOnce(json({user: {url: `${baseUrl}/users/5`}}))
			.mockResolvedValueOnce(json({expense: {url: `${baseUrl}/expenses/1`}}));

		await client.callTool({
			name: 'expense_create',
			arguments: {
				category: '285', dated_on: '2026-10-01', description: 'Lunch', gross_value: '-12.50',
			},
		});

		expect(request(0).url).toBe(`${baseUrl}/users/me`);
		expect(request(1).body.expense).toMatchObject({user: `${baseUrl}/users/5`, category: `${baseUrl}/categories/285`, gross_value: '-12.50'});
	});

	test('updates then re-reads the resource', async () => {
		fetchFn
			.mockResolvedValueOnce(new Response(''))
			.mockResolvedValueOnce(json({invoice: {url: `${baseUrl}/invoices/9`, status: 'Open'}}));

		const result = await client.callTool({name: 'invoice_transition', arguments: {id: '9', transition: 'mark_as_sent'}});

		expect(request(0)).toMatchObject({url: `${baseUrl}/invoices/9/transitions/mark_as_sent`, method: 'PUT'});
		expect(result.structuredContent).toMatchObject({status: 'Open'});
	});

	test('returns invoice PDFs as embedded resources', async () => {
		fetchFn.mockResolvedValueOnce(json({pdf: {content: 'JVBERi0='}}));

		const result = await client.callTool({name: 'invoice_pdf_get', arguments: {id: '9'}});

		expect(result.content).toEqual([{
			type: 'resource',
			resource: {uri: `${baseUrl}/invoices/9/pdf`, mimeType: 'application/pdf', blob: 'JVBERi0='},
		}]);
	});

	test('refuses resource URLs on other hosts without calling the API', async () => {
		const result = await client.callTool({name: 'invoice_get', arguments: {id: 'https://evil.example/v2/invoices/1'}});

		expect(result.isError).toBe(true);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	test('refuses to turn an attachment URL into a request on another collection', async () => {
		const result = await client.callTool({name: 'attachment_delete', arguments: {id: `${baseUrl}/attachments/../invoices/5`}});

		expect(result.isError).toBe(true);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	test('reports API errors as tool errors', async () => {
		fetchFn.mockResolvedValueOnce(new Response('{"errors":[{"message":"Dated on is invalid"}]}', {status: 422}));

		const result = await client.callTool({name: 'bill_get', arguments: {id: '1'}});

		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain('Dated on is invalid');
	});
});

describe('MCP server with default settings', () => {
	const pdf = Buffer.from('%PDF-1.4\n');
	let fetchFn: ReturnType<typeof vi.fn<typeof fetch>>;
	let client: Client;
	let dir: string;

	beforeEach(async () => {
		dir = await realpath(await mkdtemp(join(tmpdir(), 'freeagent-mcp-e2e-')));
		await mkdir(join(dir, 'receipts'));
		await mkdir(join(dir, 'downloads'));
		await writeFile(join(dir, 'receipts', 'train.pdf'), pdf);

		fetchFn = vi.fn<typeof fetch>();
		const api = new FreeAgentApi({
			baseUrl,
			tokens: {getAccessToken: async () => 'token', refreshAccessToken: async () => 'token'},
			userAgent: 'test',
			fetch: fetchFn,
		});
		const server = createServer({api, files: {attachmentDirs: [join(dir, 'receipts')], downloadDir: join(dir, 'downloads')}});
		const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);
		client = new Client({name: 'test', version: '0.0.0'});
		await client.connect(clientTransport);
	});

	afterEach(async () => {
		await rm(dir, {recursive: true, force: true});
	});

	test('hides invoice, email and delete tools', async () => {
		const names = (await client.listTools()).tools.map((tool) => tool.name);

		expect(names).toContain('bank_transaction_explanation_create');
		expect(names).toContain('expense_create');
		expect(names).not.toContain('invoice_create');
		expect(names).not.toContain('invoice_send_email');
		expect(names).not.toContain('attachment_delete');

		const result = await client.callTool({name: 'invoice_send_email', arguments: {id: '9'}});
		expect(result.isError).toBe(true);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	test('attaches a receipt from an allowed folder to an existing explanation', async () => {
		fetchFn
			.mockResolvedValueOnce(new Response(''))
			.mockResolvedValueOnce(json({bank_transaction_explanation: {url: `${baseUrl}/bank_transaction_explanations/3`}}));

		const result = await client.callTool({
			name: 'bank_transaction_explanation_update',
			arguments: {id: '3', attachment: {file_path: join(dir, 'receipts', 'train.pdf')}},
		});

		expect(result.isError).toBeFalsy();
		const [url, init] = fetchFn.mock.calls[0]!;
		expect((url as URL).href).toBe(`${baseUrl}/bank_transaction_explanations/3`);
		expect(JSON.parse(init!.body as string)).toEqual({
			bank_transaction_explanation: {
				attachment: {data: pdf.toString('base64'), file_name: 'train.pdf', content_type: 'application/x-pdf'},
			},
		});
	});

	test('will not upload files outside the attachment folders', async () => {
		await writeFile(join(dir, 'other.pdf'), pdf);

		const result = await client.callTool({
			name: 'bank_transaction_explanation_create',
			arguments: {bank_transaction: '77', category: '285', attachment: {file_path: join(dir, 'other.pdf')}},
		});

		expect(result.isError).toBe(true);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	test('saves invoice PDFs only inside the download folder, without overwriting', async () => {
		fetchFn.mockImplementation(async () => json({pdf: {content: pdf.toString('base64')}}));

		const saved = await client.callTool({name: 'invoice_pdf_get', arguments: {id: '9', save_to: 'INV-9.pdf'}});
		expect(saved.isError).toBeFalsy();
		await expect(readFile(join(dir, 'downloads', 'INV-9.pdf'))).resolves.toEqual(pdf);

		const again = await client.callTool({name: 'invoice_pdf_get', arguments: {id: '9', save_to: 'INV-9.pdf'}});
		expect(again.isError).toBe(true);

		const outside = await client.callTool({name: 'invoice_pdf_get', arguments: {id: '9', save_to: join(dir, 'x.pdf')}});
		expect(outside.isError).toBe(true);
	});
});
