// Loads src/01-core.js into Node for the simulators, with the game's content
// (the files in content/) filled in, exactly as the build does it.
// Usage:  const K = require('./load-core')(['LEVELS','Core', ...]);
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
function contentJson(){
	for (const py of ['python3', 'python', 'py']){
		try { return execFileSync(py, ['build.py', '--content-json'], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20}); }
		catch (e){ if (e.code !== 'ENOENT') { process.stderr.write(e.stderr || String(e)); process.exit(1); } }
	}
	console.error('Could not find Python. The simulators need it to read the content/ folder.');
	process.exit(1);
}
module.exports = function (names){
	const src = fs.readFileSync(path.join(root, 'src', '01-core.js'), 'utf8')
		.replace(/\/\*CONTENT\*\/\s*null/, () => contentJson().trim());
	return new Function(src + ';return {' + names.join(',') + '};')();
};
