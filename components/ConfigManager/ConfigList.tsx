/**
 * ConfigList — 配置列表
 *
 * 展示所有已保存的 API 配置，支持切换激活、编辑、测试、删除。
 */

import React, { useState } from 'react';
import type { APIConfig } from '../../src/types/api-config';
import ApiClient from '../../src/utils/api-client';

interface ConfigListProps {
  configs: APIConfig[];
  activeConfigId: string | null;
  onSelect: (id: string) => void;
  onEdit: (config: APIConfig) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

export const ConfigList: React.FC<ConfigListProps> = ({
  configs,
  activeConfigId,
  onSelect,
  onEdit,
  onDelete,
  isDark,
}) => {
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const maskKey = (key: string) => {
    if (key.length < 10) return '****';
    return `${key.slice(0, 4)}····${key.slice(-4)}`;
  };

  const handleTest = async (config: APIConfig) => {
    setTestingId(config.id);
    const result = await ApiClient.getInstance().testConnection(config);
    setTestResults(prev => ({ ...prev, [config.id]: result }));
    setTestingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const chipClass = `rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition ${
    isDark ? 'border-[#2A3140] text-[#98A2B3] hover:bg-[#252C39]' : 'border-[#E4E7EC] text-[#667085] hover:bg-[#F2F4F7]'
  }`;

  if (configs.length === 0) {
    return (
      <div className={`rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${
        isDark ? 'border-[#3A4458] text-[#98A2B3]' : 'border-[#D0D5DD] text-[#667085]'
      }`}>
        <div className="mb-2 text-2xl">📋</div>
        <div className="font-medium">还没有 API 配置</div>
        <div className="mt-1 text-xs">点击「+ 新建」来添加你的第一个配置</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {configs.map(config => {
        const isActive = config.id === activeConfigId;
        const testResult = testResults[config.id];
        const models = Array.isArray(config.models) ? config.models : [];
        const displayName = typeof config.name === 'string' && config.name.trim() ? config.name : '未命名配置';
        const displayProvider = config.provider === 'banana'
          ? 'Banana2'
          : config.provider === 'google_veo'
            ? 'Google Veo'
            : config.provider === 'openai_sora'
              ? 'OpenAI Sora'
              : '自定义';

        return (
          <div
            key={config.id}
            onClick={() => onSelect(config.id)}
            className={`cursor-pointer rounded-2xl border p-4 transition ${
              isActive
                ? isDark
                  ? 'border-[#4B5B78] bg-[#1B2330] shadow-sm'
                  : 'border-[#B2CCFF] bg-[#EEF4FF] shadow-sm'
                : isDark
                  ? 'border-[#2A3140] bg-[#161A22] hover:bg-[#1B2029]'
                  : 'border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${isActive ? 'bg-green-500' : isDark ? 'bg-[#3A4458]' : 'bg-[#D0D5DD]'}`} />
                  <span className={`text-sm font-semibold ${isDark ? 'text-[#F3F4F6]' : 'text-[#101828]'}`}>
                    {displayName}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isDark ? 'bg-[#1B2029] text-[#98A2B3]' : 'bg-[#F2F4F7] text-[#667085]'
                  }`}>
                    {displayProvider}
                  </span>
                </div>

                <div className={`mt-1.5 text-xs font-mono ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                  🔑 {maskKey(config.apiKey)}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {models.length === 0 ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isDark ? 'bg-[#1B2029] text-[#98A2B3]' : 'bg-[#F2F4F7] text-[#667085]'
                    }`}>
                      未配置模型
                    </span>
                  ) : models.map(m => (
                    <span
                      key={m.id}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        m.id === config.defaultModel
                          ? isDark ? 'bg-[#1E3A5F] text-[#B2CCFF]' : 'bg-[#DBEAFE] text-[#175CD3]'
                          : isDark ? 'bg-[#1B2029] text-[#98A2B3]' : 'bg-[#F2F4F7] text-[#667085]'
                      }`}
                    >
                      🤖 {m.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => onEdit(config)} className={chipClass}>
                ✏️ 编辑
              </button>
              <button
                type="button"
                onClick={() => handleTest(config)}
                disabled={testingId === config.id}
                className={chipClass}
              >
                {testingId === config.id ? '⏳ 测试中...' : '🔍 测试'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(config.id)}
                className={`rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition ${
                  confirmDeleteId === config.id
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : isDark ? 'border-[#7A271A] text-[#FDA29B] hover:bg-[#3A1616]' : 'border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]'
                }`}
              >
                {confirmDeleteId === config.id ? '确认删除？' : '🗑️ 删除'}
              </button>

              {testResult && (
                <span className={`ml-auto text-[11px] ${testResult.ok ? 'text-green-500' : 'text-red-400'}`}>
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
