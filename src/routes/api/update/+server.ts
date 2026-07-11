import { json } from '@sveltejs/kit';
import { execSync } from 'child_process';
import type { RequestHandler } from './$types.js';

const GITHUB_REPO = 'dominikcz/fakturownik';
const GITHUB_PAGE = 'https://github.com/dominikcz/fakturownik';

function isGitAvailable(): boolean {
	try {
		execSync('git --version', { stdio: 'pipe', timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}

function isGitRepo(): boolean {
	try {
		execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe', timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}

function getCurrentBranch(): string {
	try {
		return execSync('git branch --show-current', { stdio: 'pipe', timeout: 5000 }).toString().trim();
	} catch {
		return 'main';
	}
}

async function getLatestVersionFromGithub(branch: string): Promise<string | null> {
	try {
		const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/package.json?ref=${encodeURIComponent(branch)}`;
		const res = await fetch(url, {
			headers: { 'Accept': 'application/vnd.github.v3.raw', 'User-Agent': 'fakturownik' }
		});
		if (!res.ok) return null;
		const pkg = await res.json() as { version?: string };
		return pkg.version ?? null;
	} catch {
		return null;
	}
}

export const GET: RequestHandler = async () => {
	const gitAvailable = isGitAvailable() && isGitRepo();
	const branch = gitAvailable ? getCurrentBranch() : 'main';
	const latestVersion = await getLatestVersionFromGithub(branch);

	return json({
		latestVersion,
		gitAvailable,
		branch,
		githubPage: GITHUB_PAGE
	});
};

export const POST: RequestHandler = async () => {
	if (!isGitAvailable() || !isGitRepo()) {
		return json({ error: 'Git niedostępny' }, { status: 400 });
	}
	try {
		const output = execSync('git pull', { stdio: 'pipe', timeout: 30000 }).toString();
		return json({ success: true, output });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: message }, { status: 500 });
	}
};
