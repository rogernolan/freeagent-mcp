import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {describe, test, expect} from 'vitest';
import {createServer} from '../index.js';
import type {Config} from './types.js';

describe('tools index', () => {
	test('registers every tool file', async () => {
		const files = await readdir(join(process.cwd(), 'src/tools'));
		const toolFiles = files.filter((file) => file.endsWith('.ts') && !/index|test|types|schemas|-fields/.test(file));

		const server = createServer({} as Config);
		const registered = Object.keys((server as unknown as {_registeredTools: Record<string, unknown>})._registeredTools);

		expect(registered).toHaveLength(toolFiles.length);
		expect(new Set(registered.map((name) => name.replaceAll('_', '-')))).toEqual(new Set(toolFiles.map((file) => file.replace('.ts', ''))));
	});
});
