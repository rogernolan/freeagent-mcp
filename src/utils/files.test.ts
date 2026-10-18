import {
	mkdir, mkdtemp, realpath, rm, symlink, writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
	afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import {allowedSavePath, parseDirList, readAllowedFile} from './files.js';
import {buildAttachment} from './tools.js';

const PDF = Buffer.from('%PDF-1.4\n%fake\n');
const MAX = 5 * 1024 * 1024;

let root: string;
let receipts: string;
let downloads: string;
let outside: string;

beforeAll(async () => {
	root = await realpath(await mkdtemp(join(tmpdir(), 'freeagent-mcp-files-')));
	receipts = join(root, 'receipts');
	downloads = join(root, 'downloads');
	outside = join(root, 'outside');
	await Promise.all([receipts, downloads, outside].map(async (dir) => mkdir(dir)));
	await mkdir(join(receipts, '2026'));
	await writeFile(join(receipts, '2026', 'lunch.pdf'), PDF);
	await writeFile(join(outside, 'secret.pdf'), PDF);
	await writeFile(join(receipts, 'id_rsa.pdf'), '-----BEGIN OPENSSH PRIVATE KEY-----\n');
	await symlink(join(outside, 'secret.pdf'), join(receipts, 'link.pdf'));
	await symlink(outside, join(downloads, 'escape'));
});

afterAll(async () => {
	await rm(root, {recursive: true, force: true});
});

describe('readAllowedFile', () => {
	it('reads files inside an allowed folder', async () => {
		await expect(readAllowedFile(join(receipts, '2026', 'lunch.pdf'), {attachmentDirs: [receipts]}, MAX)).resolves.toEqual(PDF);
	});

	it('is disabled when no folders are configured', async () => {
		await expect(readAllowedFile(join(receipts, '2026', 'lunch.pdf'), {attachmentDirs: []}, MAX)).rejects.toThrow('FREEAGENT_ATTACHMENT_DIRS');
	});

	it('rejects files outside the folders, including via .. and symlinks', async () => {
		const access = {attachmentDirs: [receipts]};
		await expect(readAllowedFile(join(outside, 'secret.pdf'), access, MAX)).rejects.toThrow('outside the allowed');
		await expect(readAllowedFile(join(receipts, '..', 'outside', 'secret.pdf'), access, MAX)).rejects.toThrow('outside the allowed');
		await expect(readAllowedFile(join(receipts, 'link.pdf'), access, MAX)).rejects.toThrow('outside the allowed');
	});

	it('rejects relative paths, folders and oversized files', async () => {
		const access = {attachmentDirs: [receipts]};
		await expect(readAllowedFile('receipts/2026/lunch.pdf', access, MAX)).rejects.toThrow('absolute');
		await expect(readAllowedFile(join(receipts, '2026'), access, MAX)).rejects.toThrow('not a regular file');
		await expect(readAllowedFile(join(receipts, '2026', 'lunch.pdf'), access, 4)).rejects.toThrow('limit');
	});
});

describe('allowedSavePath', () => {
	it('resolves names inside the download folder', async () => {
		await expect(allowedSavePath('INV-1.pdf', {attachmentDirs: [], downloadDir: downloads}, '.pdf')).resolves.toBe(join(downloads, 'INV-1.pdf'));
	});

	it('is disabled without a download folder', async () => {
		await expect(allowedSavePath('INV-1.pdf', {attachmentDirs: []}, '.pdf')).rejects.toThrow('FREEAGENT_DOWNLOAD_DIR');
	});

	it('rejects paths outside the folder and other extensions', async () => {
		const access = {attachmentDirs: [], downloadDir: downloads};
		await expect(allowedSavePath(join(outside, 'x.pdf'), access, '.pdf')).rejects.toThrow('outside');
		await expect(allowedSavePath('../outside/x.pdf', access, '.pdf')).rejects.toThrow('outside');
		await expect(allowedSavePath('escape/x.pdf', access, '.pdf')).rejects.toThrow('outside');
		await expect(allowedSavePath('x.sh', access, '.pdf')).rejects.toThrow('.pdf');
	});
});

describe('parseDirList', () => {
	it('splits on the path delimiter and requires absolute paths', () => {
		expect(parseDirList('/a: /b ', 'X')).toEqual(['/a', '/b']);
		expect(parseDirList(undefined, 'X')).toEqual([]);
		expect(() => parseDirList('relative', 'X')).toThrow('absolute');
	});
});

describe('buildAttachment', () => {
	it('reads allowed files and infers the content type', async () => {
		await expect(buildAttachment({file_path: join(receipts, '2026', 'lunch.pdf')}, {attachmentDirs: [receipts]})).resolves.toEqual({
			data: PDF.toString('base64'), file_name: 'lunch.pdf', content_type: 'application/x-pdf',
		});
	});

	it('refuses local files when no folders are allowed', async () => {
		await expect(buildAttachment({file_path: join(receipts, '2026', 'lunch.pdf')})).rejects.toThrow('disabled');
	});

	it('rejects content that does not match its type', async () => {
		await expect(buildAttachment({file_path: join(receipts, 'id_rsa.pdf')}, {attachmentDirs: [receipts]})).rejects.toThrow('not a valid application/x-pdf');
		await expect(buildAttachment({data: Buffer.from('hello').toString('base64'), file_name: 'a.png'})).rejects.toThrow('not a valid image/png');
	});

	it('accepts matching base64 data and rejects data plus file_path', async () => {
		await expect(buildAttachment({data: PDF.toString('base64'), file_name: 'r.pdf'})).resolves.toMatchObject({content_type: 'application/x-pdf'});
		await expect(buildAttachment({data: 'x', file_path: '/x.pdf', file_name: 'r.pdf'})).rejects.toThrow('not both');
	});
});
