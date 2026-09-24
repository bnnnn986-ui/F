import { test, expect, type Page } from '@playwright/test';

const SIGNAL_QUERY = 'signal=localhost:9000';

async function gotoWithSignal(page: Page, hash = ''): Promise<void> {
  await page.goto(`/?${SIGNAL_QUERY}${hash}`);
}

test('reload resilience: player reload rejoins silently, host reload offers to restore the room', async ({ browser }) => {
  test.setTimeout(90_000);

  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await gotoWithSignal(hostPage);
  await hostPage.getByRole('button', { name: /สร้างโรงเตี๊ยม/ }).click();

  const codeLocator = hostPage.getByTestId('room-code');
  await expect(codeLocator).toBeVisible({ timeout: 20_000 });
  const roomCode = (await codeLocator.textContent())?.trim();

  // --- a player joins ---
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await gotoWithSignal(playerPage, `#/join/${roomCode}`);
  await playerPage.getByPlaceholder('ชื่อของคุณ').fill('Alice');
  await playerPage.getByRole('button', { name: 'เข้าร่วมโรงเตี๊ยม' }).click();
  await expect(playerPage).toHaveURL(/#\/party\/play/, { timeout: 20_000 });
  await expect(playerPage.getByText('รอผู้คุมเกมเริ่มภารกิจ…')).toBeVisible({ timeout: 20_000 });
  await expect(hostPage.getByText('Alice')).toBeVisible({ timeout: 20_000 });

  // --- player reloads: sessionStorage should silently reconnect them, same identity ---
  await playerPage.reload();
  await expect(playerPage.getByText('รอผู้คุมเกมเริ่มภารกิจ…').or(playerPage.getByText('กำลังเชื่อมต่อกลับ…'))).toBeVisible({
    timeout: 20_000,
  });
  await expect(hostPage.getByText('นักผจญภัยในโรงเตี๊ยม (1)')).toBeVisible({ timeout: 20_000 });

  // --- host reloads: snapshot lets them offer to restore the same room code ---
  await hostPage.reload();
  await expect(hostPage.getByRole('heading', { name: new RegExp(`กู้คืนห้อง #${roomCode}`) })).toBeVisible({
    timeout: 20_000,
  });
  await hostPage.getByRole('button', { name: 'กู้คืนห้องเดิม' }).click();
  await expect(hostPage.getByTestId('room-code')).toHaveText(roomCode!, { timeout: 30_000 });

  await playerContext.close();
  await hostContext.close();
});
