import { test, expect, type Page, type Download } from '@playwright/test';
import { readFileSync } from 'node:fs';

const SIGNAL_QUERY = 'signal=localhost:9000';
const FAST_QUERY = 'fast=1';

async function gotoWithSignal(page: Page, hash = ''): Promise<void> {
  await page.goto(`/?${SIGNAL_QUERY}&${FAST_QUERY}${hash}`);
}

function readCsv(download: Download): Promise<string> {
  return download.path().then((p) => (p ? readFileSync(p, 'utf-8') : ''));
}

test('team mode: 4 players (2 bots) in 2 guilds play a 2-question round, see the team podium, and export a Thai CSV report', async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await gotoWithSignal(hostPage);
  await hostPage.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();

  const codeLocator = hostPage.getByTestId('room-code');
  await expect(codeLocator).toBeVisible({ timeout: 20_000 });
  const roomCode = (await codeLocator.textContent())?.trim();

  // --- two real players join ---
  const playerPages: Page[] = [];
  for (const name of ['Alice', 'Bob']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoWithSignal(page, `#/join/${roomCode}`);
    await page.getByPlaceholder('ชื่อของคุณ').fill(name);
    await page.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();
    await expect(page).toHaveURL(/#\/party\/play/, { timeout: 20_000 });
    playerPages.push(page);
  }
  await expect(hostPage.getByText('นักผจญภัยในโรงเตี๊ยม (2)')).toBeVisible({ timeout: 20_000 });

  // --- enable team mode (2 guilds), then add 2 bots so bots auto-join the smallest team ---
  await hostPage.getByLabel('เปิดโหมดทีม').check();
  await hostPage.getByRole('button', { name: '2', exact: true }).click(); // team count = 2
  await hostPage.getByRole('button', { name: '🤖 เพิ่มนักผจญภัย NPC (0/10)' }).click();
  await hostPage.getByRole('button', { name: '🤖 เพิ่มนักผจญภัย NPC (1/10)' }).click();
  await expect(hostPage.getByText('🤖 เพิ่มนักผจญภัย NPC (2/10)')).toBeVisible();

  // --- pick Dungeon Dash, build a 2-question custom pack so the round is short ---
  await hostPage.getByRole('button', { name: /ดันเจี้ยนแดช/ }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย: ดันเจี้ยนแดช ▶' }).click();
  await expect(hostPage.getByRole('heading', { name: 'ตั้งค่าภารกิจ: ดันเจี้ยนแดช' })).toBeVisible({ timeout: 20_000 });

  await hostPage.getByRole('button', { name: '📜 สร้างชุดคำถามเอง' }).click();
  await hostPage.getByRole('button', { name: '+ ชุดคำถามใหม่' }).click();
  await hostPage.getByPlaceholder('ชื่อชุดคำถาม').fill('ทดสอบ2ข้อ');
  for (let i = 0; i < 2; i++) {
    await hostPage.getByRole('button', { name: '+ เพิ่มคำถาม' }).click();
  }
  const questionBlocks = hostPage.locator('.quiz-editor__question');
  await expect(questionBlocks).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const block = questionBlocks.nth(i);
    await block.getByPlaceholder('ข้อความคำถาม').fill(`คำถามทดสอบข้อที่ ${i + 1}`);
    const choices = block.getByPlaceholder(/ตัวเลือก \d/);
    await choices.nth(0).fill('ตัวเลือก A');
    await choices.nth(1).fill('ตัวเลือก B');
    // first radio (choice A) is already selected as correct by default
  }
  await hostPage.getByRole('button', { name: 'บันทึก' }).click();
  await hostPage.getByRole('button', { name: 'เสร็จสิ้น' }).click();

  await hostPage.getByRole('button', { name: /ทดสอบ2ข้อ/ }).click(); // select the new pack chip
  await hostPage.getByRole('button', { name: '10 วิ' }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย! ▶' }).click();

  // --- question 1 -> reveal -> question 2 -> reveal -> podium ---
  await expect(hostPage.getByText(/ข้อ 1\/2/)).toBeVisible({ timeout: 20_000 });
  const [alicePage, bobPage] = playerPages;
  await alicePage!.getByTestId('quiz-answer-0').click();
  await bobPage!.getByTestId('quiz-answer-1').click();

  await expect(hostPage.getByRole('button', { name: /ข้อถัดไป|ดูผลสรุป/ })).toBeVisible({ timeout: 15_000 });
  await hostPage.getByRole('button', { name: /ข้อถัดไป|ดูผลสรุป/ }).click();
  await expect(hostPage.getByRole('button', { name: /ดูผลสรุป/ })).toBeVisible({ timeout: 15_000 });
  await hostPage.getByRole('button', { name: /ดูผลสรุป/ }).click();

  // --- team podium ---
  await expect(hostPage.getByText('ตำนานประจำดันเจี้ยน')).toBeVisible({ timeout: 15_000 });
  await expect(hostPage.getByText('ผลกิลด์')).toBeVisible();

  // --- open the report and download CSVs ---
  await hostPage.getByRole('button', { name: '📜 ดูรายงานผล' }).click();
  await expect(hostPage.getByText('บันทึกการผจญภัย')).toBeVisible({ timeout: 10_000 });

  const downloads: Download[] = [];
  hostPage.on('download', (d) => downloads.push(d));
  await hostPage.getByRole('button', { name: '⬇️ ดาวน์โหลด CSV' }).click();
  await hostPage.waitForTimeout(1000);
  expect(downloads.length).toBeGreaterThanOrEqual(3); // players + questions + teams

  const playersCsvDownload = downloads.find((d) => d.suggestedFilename().includes('players'));
  expect(playersCsvDownload).toBeTruthy();
  const playersCsv = await readCsv(playersCsvDownload!);
  expect(playersCsv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
  expect(playersCsv).toContain('อันดับ');
  expect(playersCsv).toContain('กิลด์'); // team column present since this was a team-mode round
  expect(playersCsv).toContain('Alice');

  const teamsCsvDownload = downloads.find((d) => d.suggestedFilename().includes('teams'));
  expect(teamsCsvDownload).toBeTruthy();
  const teamsCsv = await readCsv(teamsCsvDownload!);
  expect(teamsCsv).toContain('กิลด์,จำนวนสมาชิก');

  for (const page of playerPages) await page.close();
  await hostPage.close();
});
