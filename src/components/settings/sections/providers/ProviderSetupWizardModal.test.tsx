import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as thirdPartyDiagnostics from '@/utils/thirdPartyDiagnostics';
import * as openaiCompatibleApi from '@/services/api/openaiCompatibleApi';
import { ProviderSetupWizardModal } from './ProviderSetupWizardModal';

describe('ProviderSetupWizardModal', () => {
  const renderer = setupTestRenderer({ providers: { language: 'zh' } });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Step 1 with provider info, API key link, and inputs', () => {
    act(() => {
      renderer.root.render(
        <ProviderSetupWizardModal
          isOpen={true}
          onClose={vi.fn()}
          templateId="deepseek"
          existingConnections={[]}
          onComplete={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('DeepSeek');
    expect(renderer.container.textContent).toContain('供应商配置向导');
    expect(renderer.container.textContent).toContain('凭证与端点');
    expect(renderer.container.textContent).toContain('获取 API Key');
    expect(renderer.container.textContent).toContain('验证并拉取模型');
  });

  it('calls onSkip when clicking skip button in Step 1', () => {
    const onSkip = vi.fn();

    act(() => {
      renderer.root.render(
        <ProviderSetupWizardModal
          isOpen={true}
          onClose={vi.fn()}
          templateId="deepseek"
          existingConnections={[]}
          onComplete={vi.fn()}
          onSkip={onSkip}
        />,
      );
    });

    const skipBtn = Array.from(renderer.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('稍后配置并跳过'),
    );
    expect(skipBtn).toBeDefined();

    act(() => {
      skipBtn?.click();
    });

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSkip.mock.calls[0][0].templateId).toBe('deepseek');
  });

  it('advances to Step 2, runs verification and completes configuration', async () => {
    const onComplete = vi.fn();

    vi.spyOn(thirdPartyDiagnostics, 'probeThirdPartyConnection').mockResolvedValue({
      connectionId: 'temp-wizard-probe',
      status: 'success',
      latencyMs: 128,
      modelId: 'deepseek-chat',
      timestamp: Date.now(),
      grade: 'fast',
    });

    vi.spyOn(openaiCompatibleApi, 'fetchOpenAICompatibleModels').mockResolvedValue([
      { id: 'deepseek-chat', name: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
    ]);

    act(() => {
      renderer.root.render(
        <ProviderSetupWizardModal
          isOpen={true}
          onClose={vi.fn()}
          templateId="deepseek"
          existingConnections={[]}
          onComplete={onComplete}
        />,
      );
    });

    // Enter API key
    const keyInput = renderer.container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(keyInput).toBeDefined();

    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    act(() => {
      nativeInputSetter?.call(keyInput, 'sk-my-test-key');
      keyInput.dispatchEvent(new Event('input', { bubbles: true }));
      keyInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Click Proceed
    const proceedBtn = Array.from(renderer.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('验证并拉取模型'),
    );
    expect(proceedBtn).toBeDefined();

    await act(async () => {
      proceedBtn?.click();
    });

    // Step 2 should be displayed
    expect(renderer.container.textContent).toContain('测活与选模');
    expect(renderer.container.textContent).toContain('连接验证成功');
    expect(renderer.container.textContent).toContain('DeepSeek R1');
    expect(renderer.container.textContent).toContain('Thinking');

    // Click Finish & Enable
    const finishBtn = Array.from(renderer.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('完成并启用'),
    );
    expect(finishBtn).toBeDefined();

    act(() => {
      finishBtn?.click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.templateId).toBe('deepseek');
    expect(result.apiKey).toBe('sk-my-test-key');
    expect(result.enabled).toBe(true);
    expect(result.models.length).toBe(2);
  });
});
