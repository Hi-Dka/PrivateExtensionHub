const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

const fs = require('fs');
const path = require('path');

/** Webview bundles: rendered in the sandboxed browser context of each webview. */
const WEBVIEW_ENTRIES = [
	{ entryPoint: 'src/webview/sidebar/main.tsx', outfile: 'media/sidebar.js' },
	{ entryPoint: 'src/webview/detail/main.tsx', outfile: 'media/detail.js' },
];

function copyCodicons() {
	const srcDir = path.join(__dirname, 'node_modules', '@vscode', 'codicons', 'dist');
	const destDir = path.join(__dirname, 'media', 'codicons');
	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}
	const files = ['codicon.css', 'codicon.ttf'];
	for (const f of files) {
		const srcFile = path.join(srcDir, f);
		const destFile = path.join(destDir, f);
		if (fs.existsSync(srcFile)) {
			fs.copyFileSync(srcFile, destFile);
		}
	}
}

async function main() {
	copyCodicons();
	const contexts = [];

	contexts.push(await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	}));

	for (const { entryPoint, outfile } of WEBVIEW_ENTRIES) {
		contexts.push(await esbuild.context({
			entryPoints: [entryPoint],
			bundle: true,
			format: 'iife',
			platform: 'browser',
			target: ['chrome120'],
			jsx: 'automatic',
			jsxImportSource: 'preact',
			minify: production,
			sourcemap: !production,
			sourcesContent: false,
			outfile,
			logLevel: 'silent',
			plugins: [
				esbuildProblemMatcherPlugin,
			],
		}));
	}

	if (watch) {
		await Promise.all(contexts.map((ctx) => ctx.watch()));
	} else {
		await Promise.all(contexts.map((ctx) => ctx.rebuild()));
		await Promise.all(contexts.map((ctx) => ctx.dispose()));
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
