import type {FreeAgentApi} from '../utils/freeagent-api.js';
import type {FileAccess} from '../utils/files.js';

export type Config = {
	api: FreeAgentApi;
	/** Tool names to register. Defaults to the read and write tiers (see access.ts) */
	tools?: ReadonlySet<string> | undefined;
	/** Local folders tools may read attachments from or save PDFs to. Defaults to none */
	files?: FileAccess | undefined;
};
