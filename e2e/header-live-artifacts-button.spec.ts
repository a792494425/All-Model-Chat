import { expect, test } from '@playwright/test';

test('Live Artifacts helper toggles on from an edge tap after hover', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const liveArtifactsButton = page.getByRole('button', {
    name: /Enable Live Artifacts rendering|开启 Live Artifacts 协议与工件渲染/,
  });

  await expect(liveArtifactsButton).toBeVisible();

  const box = await liveArtifactsButton.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  const centerY = box.y + box.height / 2;

  // Hover first so any hover-state transform is active, then tap near the edge.
  // Keep a small inset to avoid device-pixel rounding pushing the click outside.
  await page.mouse.move(box.x + box.width / 2, centerY);
  await page.waitForTimeout(50);
  await page.mouse.move(box.x + box.width - 2, centerY);
  await page.mouse.down();
  await page.waitForTimeout(20);
  await page.mouse.up();

  await expect(
    page.getByRole('button', {
      name: /Live Artifacts rendering is active|Live Artifacts 协议与工件渲染已开启/,
    }),
  ).toBeVisible();
});
