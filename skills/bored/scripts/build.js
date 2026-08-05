#!/usr/bin/env node
/**
 * build.js — assemble a theme + the engine into a single playable index.html.
 *
 *   node build.js <theme.js> [-o index.html]
 *
 * Claude writes only the theme file. Everything else is concatenation, so the
 * engine source never has to pass through the model.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENGINE_DIR = path.resolve(__dirname, '..');
const SHELL = path.join(ENGINE_DIR, 'shell.html');
const MARKER = '<!--BUILD:INJECT-->';

// Load order. Nothing calls across modules at definition time, but keep
// dependencies ahead of their consumers so the file reads top-down.
const MODULES = [
  'audio-engine.js',
  'particle-engine.js',
  'input-handler.js',
  'hud.js',
  'scoreboard-client.js',
  'scoreboard-ui.js',
  'runner-engine.js',
];

function die(msg) {
  console.error(`build: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let themeFile = null;
  let out = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--out') {
      out = args[++i];
    } else if (args[i].startsWith('-')) {
      die(`unknown flag ${args[i]}`);
    } else if (!themeFile) {
      themeFile = args[i];
    } else {
      die('expected exactly one theme file');
    }
  }
  if (!themeFile) die('usage: node build.js <theme.js> [-o index.html]');
  return { themeFile: path.resolve(themeFile), out };
}

/**
 * Ensure the theme has a real UUID. A model-typed UUID is not random enough to
 * be safe here — a collision silently merges two games' scoreboards. Mint it and
 * write it back so rebuilds keep the same id.
 */
function ensureGameId(themeFile, src) {
  const existing = /gameId\s*:\s*(['"`])([^'"`]*)\1/.exec(src);
  if (existing && existing[2] && existing[2] !== 'GENERATED') {
    return { src, gameId: existing[2], minted: false };
  }

  const gameId = crypto.randomUUID();
  let patched;
  if (existing) {
    patched = src.slice(0, existing.index) + `gameId: '${gameId}'` +
      src.slice(existing.index + existing[0].length);
  } else {
    const open = /const\s+THEME\s*=\s*\{/.exec(src);
    if (!open) die('theme file must declare `const THEME = { ... }`');
    const at = open.index + open[0].length;
    patched = src.slice(0, at) + `\n  gameId: '${gameId}',` + src.slice(at);
  }

  fs.writeFileSync(themeFile, patched);
  return { src: patched, gameId, minted: true };
}

function loadTheme(src, themeFile) {
  try {
    return new Function(`${src}\n;return THEME;`)();
  } catch (e) {
    die(`could not evaluate ${path.basename(themeFile)}: ${e.message}`);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function main() {
  const { themeFile, out } = parseArgs(process.argv);
  if (!fs.existsSync(themeFile)) die(`no such file: ${themeFile}`);

  const raw = fs.readFileSync(themeFile, 'utf8');
  const { src, gameId, minted } = ensureGameId(themeFile, raw);
  const theme = loadTheme(src, themeFile);

  if (!theme || typeof theme !== 'object') die('THEME is not an object');
  if (!theme.name) die('THEME.name is required');

  const shell = fs.readFileSync(SHELL, 'utf8');
  if (!shell.includes(MARKER)) die(`${SHELL} is missing the ${MARKER} marker`);

  const modules = MODULES.map((file) => {
    const p = path.join(ENGINE_DIR, 'engine', file);
    if (!fs.existsSync(p)) die(`missing engine module: ${p}`);
    return `// ===== ${file} =====\n${fs.readFileSync(p, 'utf8').trim()}`;
  });

  const bundle = [
    '// ===== theme =====',
    src.trim(),
    ...modules,
    '// ===== boot =====',
    'RunnerEngine.start(THEME);',
  ].join('\n\n');

  const html = shell
    .replace('<title>Bored Game</title>', `<title>${escapeHtml(theme.name)}</title>`)
    .replace(MARKER, bundle);

  const outFile = path.resolve(out || path.join(path.dirname(themeFile), 'index.html'));
  fs.writeFileSync(outFile, html);

  const obstacles = theme.obstacles || [];
  const ground = obstacles.filter((o) => o.type === 'ground').length;
  const air = obstacles.filter((o) => o.type === 'air').length;

  console.log(`built ${outFile}`);
  console.log(`  theme      ${theme.name}`);
  console.log(`  gameId     ${gameId}${minted ? '  (minted, written back to theme)' : ''}`);
  console.log(`  obstacles  ${ground} ground, ${air} air`);
  console.log(`  power-ups  ${(theme.powerups || []).length}`);
  console.log(`  layers     ${(theme.backgrounds || []).length} parallax`);
  console.log(`  size       ${(html.length / 1024).toFixed(1)} KB`);
}

main();
