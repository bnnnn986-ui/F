import { test, expect, devices, type Page } from '@playwright/test';

const SIGNAL_QUERY = 'signal=localhost:9000';
const FAST_QUERY = 'fast=1';

async function gotoWithSignal(page: Page, hash = ''): Promise<void> {
  await page.goto(`/?${SIGNAL_QUERY}&${FAST_QUERY}${hash}`);
}

/**
 * Track C: the host runs the whole party on a phone (iPhone 13 emulation) with
 * "โฮสต์ร่วมเล่นด้วย" ON, so the host is also a player — their own answer UI is
 * embedded in the host screen. Plays a short round (1 real phone player + 2 bots)
 * all the way to the podium, and checks the host's own embedded question view
 * never carries the correct answer before reveal.
 */
test('mobile host (iPhone 13, host-plays ON) + 1 phone player + 2 bots play to the podium', async ({ browser }) => {
  test.setTimeout(150_000);

  const hostContext = await browser.newContext({ ...devices['iPhone 13'] });
  const hostPage = await hostContext.newPage();
  await gotoWithSignal(hostPage);

  await hostPage.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();
  const codeLocator = hostPage.getByTestId('room-code');
  await expect(codeLocator).toBeVisible({ timeout: 20_000 });
  const roomCode = (await codeLocator.textContent())?.trim();
  expect(roomCode).toMatch(/^[A-Z0-9]{5}$/);

  // On a narrow (phone) viewport, "โฮสต์ร่วมเล่นด้วย" defaults ON and the create-room
  // flow prompts for the host's own name+avatar right away.
  const hostPlaysToggle = hostPage.getByRole('checkbox', { name: /โฮสต์ร่วมเล่นด้วย/ });
  await expect(hostPlaysToggle).toBeChecked({ timeout: 15_000 });
  await expect(hostPage.getByRole('heading', { name: 'ร่วมเล่นในนามใคร?' })).toBeVisible({ timeout: 15_000 });
  await hostPage.getByPlaceholder('ชื่อของคุณ').fill('GM');
  await hostPage.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();

  // One real phone player joins too.
  const playerContext = await browser.newContext({ ...devices['Pixel 7'] });
  const playerPage = await playerContext.newPage();
  await gotoWithSignal(playerPage, `#/join/${roomCode}`);
  await playerPage.getByPlaceholder('ชื่อของคุณ').fill('Dana');
  await playerPage.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();
  await expect(playerPage).toHaveURL(/#\/party\/play/, { timeout: 20_000 });

  // + 2 bots.
  await hostPage.getByRole('button', { name: /เพิ่มนักผจญภัย NPC/ }).click();
  await hostPage.getByRole('button', { name: /เพิ่มนักผจญภัย NPC/ }).click();

  await expect(hostPage.getByText('นักผจญภัยในโรงเตี๊ยม (4)')).toBeVisible({ timeout: 20_000 });

  // Start a short Dungeon Dash round.
  await hostPage.getByRole('button', { name: /ดันเจี้ยนแดช/ }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย: ดันเจี้ยนแดช' }).click();
  await expect(hostPage.getByRole('heading', { name: 'ตั้งค่าภารกิจ: ดันเจี้ยนแดช' })).toBeVisible({ timeout: 20_000 });
  await hostPage.getByRole('button', { name: '5', exact: true }).click();
  await hostPage.getByRole('button', { name: '10 วิ' }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย!' }).click();

  await expect(hostPage.getByText(/ข้อ 1\/5/).first()).toBeVisible({ timeout: 20_000 });
  await expect(playerPage.getByText(/ข้อ 1\/5/)).toBeVisible({ timeout: 20_000 });

  // The host's own embedded answer UI is visible alongside the projector view, and answerable.
  const hostEmbedded = hostPage.getByTestId('host-embedded-player');
  await expect(hostEmbedded).toBeVisible({ timeout: 15_000 });
  // Structural safety check: the host's own embedded question card is rendered by the exact
  // same PlayerView component every remote phone gets, from a payload built by buildPlayerView
  // (unit-tested in logic/reducer.test.ts to never carry `correctIndex` before reveal) — so
  // before answering, none of its 4 answer tiles are marked "locked"/correct in any way.
  await expect(hostEmbedded.locator('.is-locked')).toHaveCount(0);
  await hostEmbedded.getByTestId('quiz-answer-0').click();
  await expect(hostEmbedded.getByText('ล็อกคำตอบแล้ว!')).toBeVisible({ timeout: 10_000 });

  await playerPage.getByTestId('quiz-answer-0').click();

  async function advancePastLeaderboard(): Promise<void> {
    await hostPage.getByRole('button', { name: /ดูอันดับ/ }).click();
    const nextOrSummary = hostPage.getByRole('button', { name: /ข้อถัดไป|ดูผลสรุป/ });
    await expect(nextOrSummary).toBeVisible({ timeout: 15_000 });
    await nextOrSummary.click();
  }

  // 5 questions total: leave question 1, then advance through 2-5 (host-plays + a bot answer
  // each question so most end early; any left running end via the 10s timer).
  await expect(hostPage.getByRole('button', { name: /ดูอันดับ/ })).toBeVisible({ timeout: 15_000 });
  await advancePastLeaderboard();
  for (let i = 0; i < 4; i++) {
    await expect(hostPage.getByRole('button', { name: /ดูอันดับ/ })).toBeVisible({ timeout: 15_000 });
    await advancePastLeaderboard();
  }

  await expect(hostPage.getByText('ตำนานประจำดันเจี้ยน')).toBeVisible({ timeout: 20_000 });
  await expect(playerPage.getByText(/รอผู้คุมเกมเลือกภารกิจถัดไป/)).toBeVisible({ timeout: 20_000 });

  await playerPage.close();
  await hostPage.close();
});
