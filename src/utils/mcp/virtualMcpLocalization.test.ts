import { describe, it, expect } from 'vitest';
import { getVirtualMcpServerDisplayName, getVirtualMcpServerDisplayDescription } from './virtualMcpLocalization';

describe('virtualMcpLocalization', () => {
  const mockTranslations: Record<string, string> = {
    mcpVirtualServer_amc_library_search_name: '资料库与个人知识库检索',
    mcpVirtualServer_amc_library_search_desc: '检索并调阅本地资料库与知识库中保存的文档、代码笔记与附件。',
    mcpVirtualServer_amc_chat_memory_name: '会话历史与长期记忆',
  };

  const mockT = (key: string) => mockTranslations[key] || key;

  describe('getVirtualMcpServerDisplayName', () => {
    it('returns translated name when key exists', () => {
      const server = { id: 'amc_library_search', name: 'Knowledge Base & Library Search' };
      expect(getVirtualMcpServerDisplayName(server, mockT)).toBe('资料库与个人知识库检索');
    });

    it('falls back to server.name when key is missing or translation returns key', () => {
      const server = { id: 'custom_external_server', name: 'Custom External Server' };
      expect(getVirtualMcpServerDisplayName(server, mockT)).toBe('Custom External Server');
    });

    it('handles empty or missing server gracefully', () => {
      expect(getVirtualMcpServerDisplayName({ id: '', name: 'Fallback' }, mockT)).toBe('Fallback');
    });
  });

  describe('getVirtualMcpServerDisplayDescription', () => {
    it('returns translated description when key exists', () => {
      const server = {
        id: 'amc_library_search',
        description: 'Original English description',
      };
      expect(getVirtualMcpServerDisplayDescription(server, mockT)).toBe(
        '检索并调阅本地资料库与知识库中保存的文档、代码笔记与附件。',
      );
    });

    it('falls back to server.description when key is missing', () => {
      const server = {
        id: 'custom_external_server',
        description: 'Original English description',
      };
      expect(getVirtualMcpServerDisplayDescription(server, mockT)).toBe('Original English description');
    });
  });

  describe('integration with real coreTranslations', () => {
    it('translates all 6 virtual servers in Chinese', async () => {
      const { getTranslator } = await import('@/i18n/coreTranslations');
      const tZh = getTranslator('zh');
      const servers = [
        { id: 'amc_local_javascript', name: 'JavaScript Sandbox (Web Worker)' },
        { id: 'amc_local_python', name: 'Python Sandbox (Pyodide)' },
        { id: 'amc_chat_memory', name: 'Chat History & Long-Term Memory' },
        { id: 'amc_library_search', name: 'Knowledge Base & Library Search' },
        { id: 'amc_provider_manager', name: 'AMC Provider Manager' },
        { id: 'amc_settings_manager', name: 'AMC Settings Manager' },
      ];

      expect(getVirtualMcpServerDisplayName(servers[0], tZh)).toBe('JavaScript 代码沙箱（Web Worker）');
      expect(getVirtualMcpServerDisplayName(servers[1], tZh)).toBe('Python 代码沙箱（Pyodide）');
      expect(getVirtualMcpServerDisplayName(servers[2], tZh)).toBe('会话历史与长期记忆');
      expect(getVirtualMcpServerDisplayName(servers[3], tZh)).toBe('资料库与个人知识库检索');
      expect(getVirtualMcpServerDisplayName(servers[4], tZh)).toBe('服务商配置助手');
      expect(getVirtualMcpServerDisplayName(servers[5], tZh)).toBe('设置项管理助手');
    });

    it('translates all 6 virtual servers in English', async () => {
      const { getTranslator } = await import('@/i18n/coreTranslations');
      const tEn = getTranslator('en');
      const servers = [
        { id: 'amc_local_javascript', name: 'Fallback' },
        { id: 'amc_local_python', name: 'Fallback' },
        { id: 'amc_chat_memory', name: 'Fallback' },
        { id: 'amc_library_search', name: 'Fallback' },
        { id: 'amc_provider_manager', name: 'Fallback' },
        { id: 'amc_settings_manager', name: 'Fallback' },
      ];

      expect(getVirtualMcpServerDisplayName(servers[0], tEn)).toBe('JavaScript Sandbox (Web Worker)');
      expect(getVirtualMcpServerDisplayName(servers[1], tEn)).toBe('Python Sandbox (Pyodide)');
      expect(getVirtualMcpServerDisplayName(servers[2], tEn)).toBe('Chat History & Long-Term Memory');
      expect(getVirtualMcpServerDisplayName(servers[3], tEn)).toBe('Knowledge Base & Library Search');
      expect(getVirtualMcpServerDisplayName(servers[4], tEn)).toBe('AMC Provider Manager');
      expect(getVirtualMcpServerDisplayName(servers[5], tEn)).toBe('AMC Settings Manager');
    });
  });
});
