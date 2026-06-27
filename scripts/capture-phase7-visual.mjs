import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const outDir = resolve('artifacts/phase7-visual');
const tempDir = await mkdtemp(join(tmpdir(), 'castbox-visual-'));
await mkdir(outDir, { recursive: true });

const mainFile = join(tempDir, 'main.cjs');
const appHtml = `file://${resolve('ai-studio-frontend/dist/index.html')}`;
const script = `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const fsSync = require('node:fs');
const output = process.env.CASTBOX_VISUAL_OUTPUT;
const html = process.env.CASTBOX_VISUAL_HTML;
const profile = path.join(output, '.capture-profile');
fsSync.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
const fail = message => { console.error('VISUAL_CAPTURE_ERROR=' + message); app.exit(1); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const click = selector => window.webContents.executeJavaScript(
  '(() => { const selector = ' + JSON.stringify(selector) + '; const el = document.querySelector(selector); if (!el) throw new Error("Missing selector: " + selector); el.click(); return true; })()'
);
const clickText = (tag, text) => window.webContents.executeJavaScript(
  '(() => { const tag = ' + JSON.stringify(tag) + '; const text = ' + JSON.stringify(text) + '; const el = [...document.querySelectorAll(tag)].find(node => node.textContent.trim() === text) || [...document.querySelectorAll(tag)].find(node => node.textContent.includes(text)); if (!el) throw new Error("Missing " + tag + " text: " + text); el.click(); return true; })()'
);
const clickRoleText = text => window.webContents.executeJavaScript(
  '(() => { const text = ' + JSON.stringify(text) + '; const el = [...document.querySelectorAll("[role=button]")].find(node => node.textContent.includes(text)); if (!el) throw new Error("Missing role button: " + text); el.click(); })()'
);
const clickAt = (selector, ratio) => window.webContents.executeJavaScript(
  '(() => { const el = document.querySelector(' + JSON.stringify(selector) + '); if (!el) throw new Error("Missing selector: " + ' + JSON.stringify(selector) + '); const rect = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: rect.left + rect.width * ' + ratio + ', clientY: rect.top + rect.height / 2 })); })()'
);
const clickMenuRow = label => window.webContents.executeJavaScript(
  '(() => { const el = document.querySelector(' + JSON.stringify(label) + '); if (!el) throw new Error("Missing menu trigger: " + ' + JSON.stringify(label) + '); el.click(); })()'
);
const clickRowAction = (title, action) => window.webContents.executeJavaScript(
  '(() => { const title = ' + JSON.stringify(title) + '; const action = ' + JSON.stringify(action) + '; const heading = [...document.querySelectorAll("h4")].find(node => node.textContent.trim() === title); const row = heading?.closest(".group"); const button = row?.querySelector(action); if (!button) throw new Error("Missing row action " + action + " for " + title); button.click(); })()'
);
const capture = async name => {
  await wait(450);
  await window.webContents.executeJavaScript('document.fonts.ready');
  const size = await window.webContents.executeJavaScript('({width: innerWidth, height: innerHeight, theme: document.documentElement.dataset.theme || getComputedStyle(document.body).colorScheme || "unknown"})');
  const image = await window.webContents.capturePage();
  const imageSize = image.getSize();
  if (size.width !== 1487 || size.height !== 1058 || imageSize.width !== 1487 || imageSize.height !== 1058) {
    throw new Error('Unexpected viewport/image dimensions: ' + JSON.stringify({ viewport: size, image: imageSize }));
  }
  await fs.writeFile(path.join(output, name + '.png'), image.toPNG());
  console.log('CAPTURE=' + JSON.stringify({name, viewport: size, image: imageSize}));
};
const theme = async value => {
  await click('[aria-label="Theme selector"]');
  await clickText('button', value);
  await wait(250);
};
const both = async name => {
  await theme('Light'); await capture(name + '-light');
  await theme('Dark'); await capture(name + '-dark');
  await theme('Light');
};
const bothWithThemeMenu = async name => {
  await theme('Light'); await click('[aria-label="Theme selector"]'); await capture(name + '-light');
  await clickText('button', 'Dark'); await click('[aria-label="Theme selector"]'); await capture(name + '-dark');
  await clickText('button', 'Light');
};
let window;
app.whenReady().then(async () => {
  window = new BrowserWindow({
    width: 1487, height: 1058, useContentSize: true, show: false, offscreen: true,
    backgroundColor: '#f7f6f2',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false }
  });
  window.webContents.on('console-message', (_event, level, message) => { if (level >= 2) console.error('RENDERER_CONSOLE=' + message); });
  window.webContents.on('render-process-gone', (_event, details) => fail('renderer-gone:' + JSON.stringify(details)));
  await window.loadURL(html + '?visual-capture');
  await wait(1500);
  await clickAt('[aria-label="Playback scrubber"]', 0.603);
  await clickMenuRow('[aria-label="File menu for A Little More Time"]');
  await both('library');
  await clickText('button', 'Find');
  await clickAt('[aria-label="Playback scrubber"]', 0.252);
  await both('find');
  await clickRoleText('Just Coffee & Me');
  await click('[aria-label="Pause"]'); await bothWithThemeMenu('channel'); await click('[aria-label="Play"]');
  await clickRowAction('Blue Hour', 'button[aria-label="Play episode"]');
  await clickAt('[aria-label="Playback scrubber"]', 0.258);
  await wait(2700);
  await click('[aria-label="Details for Almost"]'); await both('episode');
  await clickText('button', 'Just Coffee & Me'); await wait(250);
  await clickRowAction('Almost', 'button[aria-label="Play episode"]');
  await clickAt('[aria-label="Playback scrubber"]', 0.252);
  await wait(2700);
  await clickText('button', 'Download 3 episodes'); await wait(350); await both('bulk-review');
  await click('[aria-label="Close dialog"]'); await clickText('button', 'Downloads');
  await clickText('button', 'Reconnect');
  await wait(3200);
  await both('downloads');
  await clickText('button', 'Settings'); await both('settings');
  await clickText('button', 'Library');
  await clickText('button', 'Find');
  await clickRoleText('Just Coffee & Me');
  await clickAt('[aria-label="Playback scrubber"]', 0.252);
  await clickText('button', 'Find');
  await click('[aria-label^="Now playing:"]');
  await clickAt('[aria-label="Seek timeline"]', 0.25);
  await click('[title="Sleep timer options"]'); await both('expanded-player');
  await click('[aria-label="Open listening queue"]');
  await clickAt('[aria-label="Seek time"]', 0.252);
  await clickMenuRow('[aria-label="Options for Late Night Drive"]');
  await both('queue');
  console.log('VISUAL_CAPTURE_RESULT=PASS');
  app.exit(0);
}).catch(fail);
`;
await (await import('node:fs/promises')).writeFile(mainFile, script);

try {
  const result = await new Promise((resolveCode, reject) => {
    const child = spawn(require('electron'), [mainFile], {
      stdio: 'inherit',
      env: { ...process.env, CASTBOX_VISUAL_OUTPUT: outDir, CASTBOX_VISUAL_HTML: appHtml },
    });
    child.on('error', reject);
    child.on('exit', code => resolveCode(code ?? 1));
  });
  process.exitCode = result;
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
