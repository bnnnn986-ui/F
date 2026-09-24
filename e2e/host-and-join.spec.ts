import { test, expect, type Page } from '@playwright/test';

const SIGNAL_QUERY = 'signal=localhost:9000';
const FAST_QUERY = 'fast=1';

async function gotoWithSignal(page: Page, hash = ''): Promise<void> {
  await page.goto(`/?${SIGNAL_QUERY}&${FAST_QUERY}${hash}`);
}

test('party room: host + 3 players play a full Dungeon Dash round and return to the tavern lobby', async ({ browser }) => {
  test.setTimeout(150_000);

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await gotoWithSignal(hostPage);

  await hostPage.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();

  const codeLocator = hostPage.getByTestId('room-code');
  await expect(codeLocator).toBeVisible({ timeout: 20_000 });
  const roomCode = (await codeLocator.textContent())?.trim();
  expect(roomCode).toMatch(/^[A-Z0-9]{5}$/);

  // --- three players join once, picking distinct classes ---
  const playerSpecs: Array<{ name: string; heroLabel: string }> = [
    { name: 'Alice', heroLabel: 'นักรบ' },
    { name: 'Bob', heroLabel: 'จอมเวท' },
    { name: 'Cara', heroLabel: 'โจร' },
  ];
  const playerPages: Page[] = [];
  for (const spec of playerSpecs) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoWithSignal(page, `#/join/${roomCode}`);

    const nameInput = page.getByPlaceholder('ชื่อของคุณ');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill(spec.name);
    await page.getByTitle(new RegExp(spec.heroLabel)).first().click();
    await page.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();

    await expect(page).toHaveURL(/#\/party\/play/, { timeout: 20_000 });
    await expect(page.getByText('รอผู้คุมเกมเริ่มภารกิจ…')).toBeVisible({ timeout: 20_000 });
    playerPages.push(page);
  }
  const [alicePage, bobPage, caraPage] = playerPages as [Page, Page, Page];

  await expect(hostPage.getByText('Alice')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('Bob')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('Cara')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('นักผจญภัยในโรงเตี๊ยม (3)')).toBeVisible();

  // --- host picks Dungeon Dash, configures a short 3-question round, starts ---
  await hostPage.getByRole('button', { name: /ดันเจี้ยนแดช/ }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย: ดันเจี้ยนแดช' }).click();

  await expect(hostPage.getByRole('heading', { name: 'ตั้งค่าภารกิจ: ดันเจี้ยนแดช' })).toBeVisible({ timeout: 20_000 });
  await hostPage.getByRole('button', { name: '5', exact: true }).click();
  await hostPage.getByRole('button', { name: '10 วิ' }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย!' }).click();

  // --- countdown -> question 1 on every screen ---
  for (const page of [hostPage, ...playerPages]) {
    await expect(page.getByText(/ข้อ 1\/5/)).toBeVisible({ timeout: 20_000 });
  }

  // Alice answers correctly, Bob answers wrong, Cara doesn't answer (times out at 10s).
  async function answer(page: Page, index: number) {
    const btn = page.getByTestId(`quiz-answer-${index}`);
    await btn.click();
  }

  // Read the correct answer from the host's per-question data isn't exposed pre-reveal,
  // so instead: have Alice always pick option 0 and assert her result after reveal —
  // whichever it is, the important thing is host/player state stays consistent.
  await answer(alicePage, 0);
  await answer(bobPage, 1);
  // Cara intentionally does not answer this question.

  // --- reveal appears (either via "everyone answered" is impossible since Cara never
  // answers, so this waits for the 10s timer) — Kahoot-style answer-summary bars ---
  await expect(hostPage.getByRole('button', { name: /ดูอันดับ/ })).toBeVisible({ timeout: 15_000 });

  // Player result screens show a definitive mark.
  for (const page of [alicePage, bobPage]) {
    await expect(page.locator('.quiz-result__mark')).toBeVisible({ timeout: 10_000 });
  }
  await expect(caraPage.getByText('ไม่ได้ตอบ')).toBeVisible({ timeout: 10_000 });

  // --- reveal -> leaderboard -> next question (or podium summary) ---
  async function advancePastLeaderboard(): Promise<void> {
    await hostPage.getByRole('button', { name: /ดูอันดับ/ }).click();
    const nextOrSummary = hostPage.getByRole('button', { name: /ข้อถัดไป|ดูผลสรุป/ });
    await expect(nextOrSummary).toBeVisible({ timeout: 15_000 });
    await nextOrSummary.click();
  }

  // --- advance through questions 2-5 (nobody answers, so each ends via the 10s timer) ---
  await advancePastLeaderboard(); // leave question 1
  for (let i = 0; i < 4; i++) {
    await expect(hostPage.getByRole('button', { name: /ดูอันดับ/ })).toBeVisible({ timeout: 15_000 });
    await advancePastLeaderboard();
  }

  // --- podium on host ---
  await expect(hostPage.getByText('ตำนานประจำดันเจี้ยน')).toBeVisible({ timeout: 15_000 });

  // --- players see their own podium screen ---
  for (const page of playerPages) {
    await expect(page.getByText(/รอผู้คุมเกมเลือกภารกิจถัดไป/)).toBeVisible({ timeout: 15_000 });
  }

  // --- host returns to the tavern lobby; results feed the party leaderboard ---
  await hostPage.getByRole('button', { name: /กลับโรงเตี๊ยม/ }).click();
  await expect(hostPage.getByText('นักผจญภัยในโรงเตี๊ยม (3)')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('ตำนานประจำงาน')).toBeVisible({ timeout: 20_000 });

  for (const page of playerPages) {
    await expect(page.getByText('รอผู้คุมเกมเริ่มภารกิจ…')).toBeVisible({ timeout: 20_000 });
  }

  for (const page of playerPages) await page.close();
  await hostPage.close();
});

test('host control bar: "จบเกม" -> "ไปที่โพเดียมเลย" tallies scores so far and returns to the tavern', async ({ browser }) => {
  test.setTimeout(90_000);

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await gotoWithSignal(hostPage);

  await hostPage.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();
  const codeLocator = hostPage.getByTestId('room-code');
  await expect(codeLocator).toBeVisible({ timeout: 20_000 });
  const roomCode = (await codeLocator.textContent())?.trim();

  // One real player (the "ออกผจญภัย!" start button needs at least 1 non-bot player) + a bot.
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await gotoWithSignal(playerPage, `#/join/${roomCode}`);
  await playerPage.getByPlaceholder('ชื่อของคุณ').fill('Dee');
  await playerPage.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();
  await expect(playerPage).toHaveURL(/#\/party\/play/, { timeout: 20_000 });
  await expect(hostPage.getByText('Dee')).toBeVisible({ timeout: 20_000 });

  await hostPage.getByRole('button', { name: 'เพิ่มนักผจญภัย NPC (0/10)' }).click();
  await expect(hostPage.getByText('เพิ่มนักผจญภัย NPC (1/10)')).toBeVisible();

  await hostPage.getByRole('button', { name: /ดันเจี้ยนแดช/ }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย: ดันเจี้ยนแดช' }).click();
  await expect(hostPage.getByRole('heading', { name: 'ตั้งค่าภารกิจ: ดันเจี้ยนแดช' })).toBeVisible({ timeout: 20_000 });
  await hostPage.getByRole('button', { name: '10 วิ' }).click();
  await hostPage.getByRole('button', { name: 'ออกผจญภัย!' }).click();

  // Wait for a live question (through countdown + the read phase) and use the control bar.
  await expect(hostPage.getByText(/ข้อ 1\//)).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByTestId('host-control-bar')).toBeVisible();

  await hostPage.getByRole('button', { name: /จบเกม/ }).click();
  await expect(hostPage.getByText('จบภารกิจนี้แล้วกลับโรงเตี๊ยม?')).toBeVisible();
  await hostPage.getByRole('button', { name: /ไปที่โพเดียมเลย/ }).click();

  // Podium shows up with the bot's (possibly 0) tallied score, still inside the round.
  await expect(hostPage.getByText('ตำนานประจำดันเจี้ยน')).toBeVisible({ timeout: 15_000 });
  await expect(hostPage.locator('.quiz-podium__full-list li')).toHaveCount(2);

  // Back to the tavern — the round's score feeds the party leaderboard.
  await hostPage.getByRole('button', { name: /กลับโรงเตี๊ยม/ }).click();
  await expect(hostPage.getByText('เพิ่มนักผจญภัย NPC (1/10)')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('ตำนานประจำงาน')).toBeVisible({ timeout: 20_000 });

  await playerPage.close();
  await hostPage.close();
});
