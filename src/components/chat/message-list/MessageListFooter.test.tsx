import { describe, expect, it } from 'vitest';
import { setupTestRenderer } from '@/test/render/renderer';
import { MessageListFooter } from './MessageListFooter';

describe('MessageListFooter', () => {
  const renderer = setupTestRenderer();

  it('uses a stable spacer height tied to the measured composer height without layout shifts', () => {
    renderer.render(<MessageListFooter chatInputHeight={144} />);

    const spacer = renderer.container.firstElementChild as HTMLDivElement | null;

    expect(spacer?.style.height).toBe('164px');
    expect(spacer?.style.maxHeight).toBe('');
    expect(spacer?.style.transition).toBe('');
    expect(spacer?.style.overflowAnchor).toBe('none');
  });

  it('rounds the spacer up to a stable whole pixel when the input height is fractional', () => {
    renderer.render(<MessageListFooter chatInputHeight={160.8} />);

    const spacer = renderer.container.firstElementChild as HTMLDivElement | null;

    expect(spacer?.style.height).toBe('181px');
  });

  it('falls back to default composer height when chatInputHeight is 0 or undefined', () => {
    renderer.render(<MessageListFooter chatInputHeight={0} />);

    const spacer = renderer.container.firstElementChild as HTMLDivElement | null;

    expect(spacer?.style.height).toBe('160px');
  });
});
