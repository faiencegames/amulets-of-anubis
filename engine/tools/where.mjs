// Where the engine is, where the game it builds is, and that game's values
// from edition.jsonc, for the browser tools. The rule is the one in
// tools/where.py and build.py: the game is the folder that holds
// edition.jsonc (TESSERA_GAME if set; else the folder above the engine when
// it sits inside a game as engine/; else the engine's own folder; else its
// example/ game).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gameRoot() {
	if (process.env.TESSERA_GAME) return path.resolve(process.env.TESSERA_GAME);
	const above = path.dirname(ENGINE);
	if (path.basename(ENGINE) === 'engine' && fs.existsSync(path.join(above, 'edition.jsonc'))) return above;
	if (fs.existsSync(path.join(ENGINE, 'edition.jsonc'))) return ENGINE;
	return path.join(ENGINE, 'example');
}
export const GAME = gameRoot();

// edition.jsonc as the build reads it: name, file, saveKey, tryKey, exportPrefix...
function readEdition() {
	for (const py of ['python3', 'python', 'py']) {
		const r = spawnSync(py, [path.join(ENGINE, 'build.py'), '--edition-json'], { encoding: 'utf8', env: { ...process.env, TESSERA_GAME: GAME } });
		if (r.error && r.error.code === 'ENOENT') continue;
		if (r.status !== 0) {
			process.stderr.write(r.stderr || '');
			process.exit(1);
		}
		return JSON.parse(r.stdout);
	}
	console.error('Could not find Python. The tools need it to read edition.jsonc.');
	process.exit(1);
}
export const EDITION = readEdition();
// the built game file
export const GAME_FILE = path.join(GAME, 'dist', EDITION.file + '.html');

// the checked content, as the game sees it (build.py --content-json), read once
let checked = null;
export function content() {
	if (!checked) {
		const r = spawnSync('python3', [path.join(ENGINE, 'build.py'), '--content-json'], {
			encoding: 'utf8',
			maxBuffer: 1 << 28,
			env: { ...process.env, TESSERA_GAME: GAME },
		});
		if (r.status !== 0) {
			process.stderr.write(r.stderr || '');
			process.exit(1);
		}
		checked = JSON.parse(r.stdout);
	}
	return checked;
}
// the words on a button, for finding it on screen (content/text.jsonc)
export const words = key =>
	(content().text[key] || key)
		.replace(/\*/g, '')
		.replace(/\{[^}]*\}/g, '')
		.trim();
