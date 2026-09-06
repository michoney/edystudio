import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto('http://127.0.0.1:8767/3d-web/aethera/');
  await page.waitForFunction(() => document.querySelector('video').currentTime > .6);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('h1').innerText(), 'Beyond silence, we build\nthe eternal.');
  await page.screenshot({ path: '../artifacts/aethera-desktop.png' });
  await page.getByRole('button', { name: 'Begin Journey', exact: true }).first().click();
  assert.equal(await page.locator('dialog').evaluate(d => d.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').evaluate(d => d.open), false);
  await page.getByRole('button', { name: 'Pause background video', exact: true }).click();
  assert.equal(await page.locator('video').evaluate(v => v.paused), true);
  const fade = async time => {
    await page.locator('video').evaluate((v, t) => { v.currentTime = t; }, time);
    await page.waitForFunction(t => { const v = document.querySelector('video'); return !v.seeking && Math.abs(v.currentTime - t) < .02 && Math.abs(Number(v.style.opacity) - .5) < .06; }, time);
    return Number(await page.locator('video').evaluate(v => v.style.opacity));
  };
  assert.ok(Math.abs(await fade(.25) - .5) < .06, 'Half opacity at 0.25s');
  const duration = await page.locator('video').evaluate(v => v.duration);
  assert.ok(Math.abs(await fade(duration - .25) - .5) < .06, 'Half opacity before ending');
  await page.locator('video').evaluate(v => { v.currentTime = v.duration - .15; window.__ended = 0; v.addEventListener('ended', () => window.__ended++); });
  await page.getByRole('button', { name: 'Play background video', exact: true }).click();
  await page.waitForFunction(() => window.__ended > 0 && document.querySelector('video').currentTime > .1 && document.querySelector('video').currentTime < 2, { timeout: 10000 });
  assert.equal(await page.locator('video').evaluate(v => v.loop), false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '../artifacts/aethera-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Studio', exact: true }).click();
  assert.equal(await page.locator('dialog').evaluate(d => d.open), true);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('video').evaluate(v => v.paused), true);
  await page.goto('http://127.0.0.1:8767/3d-web/');
  await page.getByRole('link', { name: '打开第一个作品 Aethera' }).click();
  assert.ok(page.url().endsWith('/3d-web/aethera/'));
  assert.deepEqual(errors, []);
  console.log('PASS: desktop, mobile, navigation, dialog, pause, fade-in/out, actual ended/restart loop, reduced motion, collection link, zero browser errors.');
} finally { await browser.close(); }
