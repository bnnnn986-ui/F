import { test, expect, type Page } from '@playwright/test';

const SIGNAL_QUERY = 'signal=localhost:9000';

async function gotoWithSignal(page: Page, hash = ''): Promise<void> {
  await page.goto(`/?${SIGNAL_QUERY}${hash}`);
}

test('host creates a party room, players join, host picks a game, then returns to lobby', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await gotoWithSignal(hostPage);

  await hostPage.getByRole('button', { name: /สร้างห้องปาร์ตี้/ }).click();

  const codeLocator = hostPage.getByTestId('room-code');
  await expect(codeLocator).toBeVisible({ timeout: 20_000 });
  const roomCode = (await codeLocator.textContent())?.trim();
  expect(roomCode).toMatch(/^[A-Z0-9]{5}$/);

  // --- two players join once, via the room code ---
  const playerNames = ['Alice', 'Bob'];
  const playerPages: Page[] = [];
  for (const name of playerNames) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoWithSignal(page, `#/join/${roomCode}`);

    const nameInput = page.getByPlaceholder('ชื่อของคุณ');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill(name);
    await page.getByRole('button', { name: 'เข้าร่วมห้อง' }).click();

    await expect(page).toHaveURL(/#\/party\/play/, { timeout: 20_000 });
    await expect(page.getByText('รอโฮสต์เริ่มเกม…')).toBeVisible({ timeout: 20_000 });
    playerPages.push(page);
  }

  // --- host party lobby shows both players ---
  await expect(hostPage.getByText('Alice')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('Bob')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('ผู้เล่นในห้อง (2)')).toBeVisible();

  // --- host picks Quiz Race and starts it ---
  await hostPage.getByRole('button', { name: /ควิซวิ่งแข่ง/ }).click();
  const startButton = hostPage.getByRole('button', { name: /เริ่ม ควิซวิ่งแข่ง/ });
  await expect(startButton).toBeEnabled({ timeout: 10_000 });
  await startButton.click();

  await expect(hostPage.getByText('ควิซวิ่งแข่ง — กำลังเล่นอยู่')).toBeVisible({ timeout: 20_000 });

  // --- both players' screens switch into the game automatically ---
  for (const page of playerPages) {
    await expect(page.getByText('รอโฮสต์เริ่มคำถามแรก…')).toBeVisible({ timeout: 20_000 });
  }

  // --- host ends the game; everyone returns to the party lobby ---
  await hostPage.getByRole('button', { name: /กลับล็อบบี้/ }).click();
  await expect(hostPage.getByText('ผู้เล่นในห้อง (2)')).toBeVisible({ timeout: 20_000 });
  for (const page of playerPages) {
    await expect(page.getByText('รอโฮสต์เริ่มเกม…')).toBeVisible({ timeout: 20_000 });
  }

  for (const page of playerPages) await page.close();
  await hostPage.close();
});
