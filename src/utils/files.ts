import {open, realpath, stat} from 'node:fs/promises';
import {
	basename, dirname, extname, isAbsolute, relative, resolve, sep,
} from 'node:path';

/**
 * Which local folders tools may touch. Tool arguments come from the model, and content it reads (a receipt, a bank
 * transaction description) can contain prompt injection, so file access is limited to folders the user chose.
 */
export type FileAccess = {
	/** Folders `file_path` attachments may be read from. Empty disables local file uploads */
	attachmentDirs: readonly string[];
	/** Folder invoice PDFs may be saved to. Unset disables saving */
	downloadDir?: string | undefined;
};

export const NO_FILE_ACCESS: FileAccess = {attachmentDirs: []};

/** Parse a list of absolute folders separated by the platform path delimiter (":" on macOS/Linux) */
export function parseDirList(value: string | undefined, name: string): string[] {
	const dirs = (value ?? '').split(process.platform === 'win32' ? ';' : ':').map((dir) => dir.trim()).filter(Boolean);
	for (const dir of dirs) {
		if (!isAbsolute(dir)) {
			throw new Error(`freeagent-mcp: ${name} must contain absolute paths, got "${dir}"`);
		}
	}

	return dirs;
}

function isWithin(dir: string, file: string, allowSame = false): boolean {
	const rel = relative(dir, file);
	if (rel === '') {
		return allowSame;
	}

	return !isAbsolute(rel) && rel.split(sep)[0] !== '..';
}

async function realDirs(dirs: readonly string[]): Promise<string[]> {
	const resolved = await Promise.all(dirs.map(async (dir) => realpath(dir).catch(() => undefined)));
	return resolved.filter((dir): dir is string => dir !== undefined);
}

/** Read a regular file that (after resolving symlinks) is inside one of the allowed attachment folders */
export async function readAllowedFile(path: string, access: FileAccess, maxBytes: number): Promise<Buffer> {
	if (access.attachmentDirs.length === 0) {
		throw new Error('Uploading local files is disabled. Set FREEAGENT_ATTACHMENT_DIRS to the folder(s) holding your receipts, or send `data` instead');
	}

	const dirs = await realDirs(access.attachmentDirs);
	// Relative paths are looked up in each attachment folder, for clients (like Cowork) that see the folder at another path
	const candidates = isAbsolute(path) ? [path] : dirs.map((dir) => resolve(dir, path));
	let real: string | undefined;
	for (const candidate of candidates) {
		// eslint-disable-next-line no-await-in-loop
		real = await realpath(candidate).catch(() => undefined);
		if (real) {
			break;
		}
	}

	if (!real) {
		throw new Error(`${path} not found${isAbsolute(path) ? '' : ` in the attachment folders (${access.attachmentDirs.join(', ')})`}`);
	}

	if (!dirs.some((dir) => isWithin(dir, real))) {
		throw new Error(`${path} is outside the allowed attachment folders (${access.attachmentDirs.join(', ')})`);
	}

	const info = await stat(real);
	if (!info.isFile()) {
		throw new Error(`${path} is not a regular file`);
	}

	if (info.size > maxBytes) {
		throw new Error(`Attachment ${path} is ${info.size} bytes; FreeAgent's limit is ${maxBytes / 1024 / 1024}MB`);
	}

	const handle = await open(real, 'r');
	try {
		return await handle.readFile();
	} finally {
		await handle.close();
	}
}

/**
 * Resolve where to save a download: a file name or path inside the download folder, which must not exist yet.
 * Returns the path to write with the 'wx' flag.
 */
export async function allowedSavePath(saveTo: string, access: FileAccess, extension: string): Promise<string> {
	if (!access.downloadDir) {
		throw new Error('Saving files is disabled. Set FREEAGENT_DOWNLOAD_DIR to the folder downloads may be written to');
	}

	const target = resolve(access.downloadDir, saveTo);
	if (extname(target).toLowerCase() !== extension) {
		throw new Error(`save_to must end in ${extension}, got: ${saveTo}`);
	}

	const [root] = await realDirs([access.downloadDir]);
	if (!root) {
		throw new Error(`FREEAGENT_DOWNLOAD_DIR ${access.downloadDir} does not exist`);
	}

	const parent = await realpath(dirname(target));
	if (!isWithin(root, parent, true)) {
		throw new Error(`${saveTo} is outside the download folder ${access.downloadDir}`);
	}

	return resolve(parent, basename(target));
}
