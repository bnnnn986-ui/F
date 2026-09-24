import { chromium, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-F/00b8e4b7-da06-50b7-a5d8-d47763f47929/scratchpad/shots/phase4/trackC';
const BASE = 'http://localhost:4173';
const Q = 'signal=localhost:9000&fast=1';
const localChrome = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = existsSync(localChrome) ? localChrome : undefined;

const browser = await chromium.launch({ executablePath });

async function newRoom(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?${Q}`);
  await page.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();
  const codeLocator = page.getByTestId('room-code');
  await codeLocator.waitFor({ timeout: 20000 });
  const code = (await codeLocator.textContent())?.trim();
  // dismiss host-plays modal if present (desktop viewport shouldn't show it, but just in case)
  return { ctx, page, code };
}

async function addBots(page, n) {
  for (let i = 0; i < n; i++) {
    await page.getByRole('button', { name: /เพิ่มนักผจญภัย NPC/ }).click();
  }
}

async function addRealPlayer(code, name = 'Alice') {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?${Q}#/join/${code}`);
  await page.getByPlaceholder('ชื่อของคุณ').fill(name);
  await page.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();
  await page.waitForTimeout(300);
  return ctx;
}

async function startGame(page) {
  await page.getByRole('button', { name: /ดันเจี้ยนแดช/ }).click();
  await page.getByRole('button', { name: 'ออกผจญภัย: ดันเจี้ยนแดช' }).click();
  await page.getByRole('heading', { name: 'ตั้งค่าภารกิจ: ดันเจี้ยนแดช' }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: '10 วิ' }).click();
  await page.getByRole('button', { name: 'ออกผจญภัย!' }).click();
}

// --- Desktop host: question phase (1920) ---
{
  const { ctx, page, code } = await newRoom({ width: 1920, height: 1080 });
  const playerCtx = await addRealPlayer(code, 'Alice');
  await addBots(page, 3);
  await startGame(page);
  await page.getByText(/ข้อ 1\/5/).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/host-question-d1920.png` });
  // wait for reveal
  await page.getByRole('button', { name: /ดูอันดับ/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/host-reveal-d1920.png` });
  await page.getByRole('button', { name: /ดูอันดับ/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/host-leaderboard-d1920.png` });
  await playerCtx.close();
  await ctx.close();
}

// --- Desktop 1440 host: podium (play out full round) ---
{
  const { ctx, page, code } = await newRoom({ width: 1440, height: 900 });
  const playerCtx = await addRealPlayer(code, 'Alice');
  await addBots(page, 3);
  await startGame(page);
  for (let q = 0; q < 5; q++) {
    await page.getByRole('button', { name: /ดูอันดับ/ }).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: /ดูอันดับ/ }).click();
    const next = page.getByRole('button', { name: /ข้อถัดไป|ดูผลสรุป/ });
    await next.waitFor({ timeout: 15000 });
    await next.click();
  }
  await page.getByText('ตำนานประจำดันเจี้ยน').waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/host-podium-d1440.png` });
  await playerCtx.close();
  await ctx.close();
}

// --- Mobile 390: player question tiles 2x2 ---
{
  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const hostPage = await hostCtx.newPage();
  await hostPage.goto(`${BASE}/?${Q}`);
  await hostPage.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();
  const codeLocator = hostPage.getByTestId('room-code');
  await codeLocator.waitFor({ timeout: 20000 });
  const code = (await codeLocator.textContent())?.trim();

  const playerCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const playerPage = await playerCtx.newPage();
  await playerPage.goto(`${BASE}/?${Q}#/join/${code}`);
  await playerPage.getByPlaceholder('ชื่อของคุณ').fill('Dana');
  await playerPage.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();

  await addBots(hostPage, 1);
  await startGame(hostPage);
  await playerPage.getByText(/ข้อ 1\/5/).waitFor({ timeout: 20000 });
  await playerPage.waitForTimeout(500);
  await playerPage.screenshot({ path: `${OUT}/player-question-m390.png` });

  // player lobby screenshot after round via reload of host? simpler: just capture lobby before start
  await hostCtx.close();
  await playerCtx.close();
}

// --- Mobile 360: host bottom sheet ---
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?${Q}`);
  await page.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();
  await page.getByTestId('room-code').waitFor({ timeout: 20000 });
  // dismiss host-plays modal (turn off)
  const modalHeading = page.getByRole('heading', { name: 'ร่วมเล่นในนามใคร?' });
  if (await modalHeading.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => {});
  }
  const code360 = (await page.getByTestId('room-code').textContent())?.trim();
  const playerCtx360 = await addRealPlayer(code360, 'Alice');
  await addBots(page, 1);
  await startGame(page);
  await page.getByText(/ข้อ 1\/5/).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/host-question-m360.png` });
  const trigger = page.getByRole('button', { name: 'เมนูโฮสต์' });
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/host-menu-sheet-m360.png` });
  }
  await playerCtx360.close();
  await ctx.close();
}

console.log('done batch 2');
await browser.close();
