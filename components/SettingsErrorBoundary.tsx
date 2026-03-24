import React from 'react';

interface SettingsErrorBoundaryProps {
  children: React.ReactNode;
  isDark: boolean;
  onClose: () => void;
}

interface SettingsErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  hasRecovered: boolean;
}

export class SettingsErrorBoundary extends React.Component<SettingsErrorBoundaryProps, SettingsErrorBoundaryState> {
  state: SettingsErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    hasRecovered: false,
  };

  static getDerivedStateFromError(error: Error): SettingsErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || '设置面板渲染失败',
      hasRecovered: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SettingsErrorBoundary] Settings panel crashed', error, errorInfo);

    if (!this.state.hasRecovered) {
      localStorage.removeItem('apiConfigs.v2');
      localStorage.removeItem('apiConfigs.v2.legacy');
      this.setState({ hasError: false, errorMessage: '', hasRecovered: true });
    }
  }

  private handleResetApiConfigs = () => {
    localStorage.removeItem('apiConfigs.v2');
    localStorage.removeItem('apiConfigs.v2.legacy');
    this.setState({ hasError: false, errorMessage: '', hasRecovered: true });
  };

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '', hasRecovered: true });
  };

  render() {
    const { children, isDark, onClose } = this.props;
    const { hasError, errorMessage } = this.state;

    if (!hasError) {
      return children;
    }

    return (
      <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 backdrop-blur-sm">
        <div className={`w-[92%] max-w-[520px] rounded-[28px] border p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${
          isDark ? 'border-[#2A3140] bg-[#12151B] text-[#F3F4F6]' : 'border-[#E4E7EC] bg-white text-[#101828]'
        }`}>
          <div className="space-y-3">
            <div>
              <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#98A2B3]' : 'text-[#667085]'}`}>
                Settings Crash Guard
              </div>
              <h3 className="mt-2 text-xl font-semibold">设置面板渲染失败</h3>
              <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-[#98A2B3]' : 'text-[#667085]'}`}>
                当前不会再直接白屏。通常是旧的本地 API 配置结构不完整导致的运行时错误。
              </p>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-[#3A4458] bg-[#161A22] text-[#D0D5DD]' : 'border-[#E4E7EC] bg-[#F8FAFC] text-[#344054]'}`}>
              {errorMessage || '未知错误'}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  isDark ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white' : 'bg-[#111827] text-white hover:bg-[#0F172A]'
                }`}
              >
                重试渲染
              </button>
              <button
                type="button"
                onClick={this.handleResetApiConfigs}
                className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                  isDark ? 'border-[#4B5B78] bg-[#1B2330] text-[#B2CCFF] hover:bg-[#252C39]' : 'border-[#B2CCFF] bg-[#EEF4FF] text-[#175CD3] hover:bg-[#DBEAFE]'
                }`}
              >
                清除 API 配置缓存
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                  isDark ? 'border-[#2A3140] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F2F4F7]'
                }`}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
