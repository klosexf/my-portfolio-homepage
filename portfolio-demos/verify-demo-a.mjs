import { createRequire } from 'module';
const require = createRequire('/opt/homebrew/Cellar/node/25.6.1/lib/node_modules/');
const { chromium } = require('playwright');
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.join(dir, 'demo-a-macos-desktop.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const states = [
  { app: 'repaste', out: 'verify-a-repaste.png' },
  { app: 'readless', out: 'verify-a-readless.png' },
  { app: 'wtd', out: 'verify-a-wtd.png' },
];

await page.goto(file);
for (const s of states) {
  await page.click(`.dock-item[data-app="${s.app}"]`);
  await page.waitForTimeout(6500); // 等待 iframe 内产品页自动动画播放
  await page.screenshot({ path: path.join(dir, s.out) });
  console.log('saved', s.out);
}

await browser.close();
