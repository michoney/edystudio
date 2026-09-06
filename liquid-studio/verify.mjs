import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true, proxy: { server: 'http://127.0.0.1:7892', bypass: '127.0.0.1,localhost' } });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const site = 'http://127.0.0.1:8767/3d-web/liquid-studio/';
try {
  await page.goto(site);
  await page.waitForFunction(() => [...document.querySelectorAll('main video')].every(v => v.currentTime > .8));
  await page.waitForTimeout(2500);
  assert.equal(await page.locator('section').count(), 2);
  assert.equal(await page.locator('#studio').evaluate(e => e.getBoundingClientRect().height), 1000);
  assert.equal(await page.locator('article').count(), 3);
  assert.equal(await page.evaluate(() => document.fonts.check('italic 48px "Instrument Serif"') && document.fonts.check('16px Barlow')), true);
  await page.screenshot({ path: '../artifacts/liquid-desktop.png' });

  // Real playback-ended events must restart both sources without native loop.
  await page.locator('main video').evaluateAll(videos => videos.forEach(v => { v.dataset.ends = '0'; v.addEventListener('ended', () => v.dataset.ends = String(Number(v.dataset.ends) + 1)); v.currentTime = v.duration - .45; }));
  await page.waitForFunction(() => [...document.querySelectorAll('main video')].every(v => Number(v.dataset.ends) > 0 && v.currentTime > .7 && !v.paused), null, { timeout: 15000 });
  assert.equal(await page.locator('main video').evaluateAll(vs => vs.every(v => !v.loop)), true);

  await page.getByRole('button', { name: 'Watch Showreel' }).click();
  assert.equal(await page.locator('dialog').evaluate(d => d.open), true);
  await page.waitForFunction(() => document.querySelector('dialog video')?.currentTime > .1);
  assert.equal(await page.locator('main video').evaluateAll(vs => vs.every(v => v.paused)), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog video').count(), 0);
  await page.waitForFunction(() => [...document.querySelectorAll('main video')].every(v => !v.paused));

  await page.getByRole('button', { name: 'Start a Project', exact: true }).first().click();
  await page.getByLabel('Your name').fill('Preview Tester');
  await page.getByLabel('Email', { exact: true }).fill('preview@example.com');
  await page.getByLabel('What would you like to create?').fill('A cinematic portfolio.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project brief' }).click();
  assert.equal((await downloadPromise).suggestedFilename(), 'studio-project-brief.txt');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Behind the glass.' }).isVisible(), true);
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: 'Services', exact: true }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: '../artifacts/liquid-capabilities.png' });
  await page.getByRole('button', { name: 'PAUSE BACKGROUNDS' }).click();
  await page.waitForTimeout(150);
  const times = await page.locator('main video').evaluateAll(vs => vs.map(v => v.currentTime));
  await page.waitForTimeout(300);
  assert.deepEqual(await page.locator('main video').evaluateAll(vs => vs.map(v => v.currentTime)), times);
  await page.getByRole('button', { name: 'PLAY BACKGROUNDS' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(site);
  await page.waitForTimeout(3000);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator('#studio').evaluate(e => e.getBoundingClientRect().height), 844);
  await page.screenshot({ path: '../artifacts/liquid-mobile.png' });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.locator('#mobile-menu').getByRole('link', { name: 'Services', exact: true }).click();
  await page.waitForTimeout(1200);
  const positions = await page.locator('article').evaluateAll(es => es.map(e => ({ x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y })));
  assert.ok(positions.every(p => p.x === positions[0].x) && positions[1].y > positions[0].y && positions[2].y > positions[1].y);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(200);
  assert.equal(await page.locator('main video').evaluateAll(vs => vs.every(v => v.paused)), true);

  await page.goto('http://127.0.0.1:8767/3d-web/');
  const works = page.locator('.work');
  assert.equal(await works.count(), 2);
  assert.ok((await works.nth(1).boundingBox()).y > (await works.nth(0).boundingBox()).y);
  await page.getByRole('link', { name: '打开第二个作品 Liquid Studio' }).click();
  assert.ok(page.url().endsWith('/3d-web/liquid-studio/'));
  assert.deepEqual(errors, []);
  console.log('PASS: two sections, desktop/mobile layout, fonts, both real video loops, showreel, project brief, journal, navigation, pause/resume, reduced motion, vertical collection order, zero browser errors.');
} finally { await browser.close(); }
