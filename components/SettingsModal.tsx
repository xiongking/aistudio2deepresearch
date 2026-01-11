import React, { useState } from 'react';
import { Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<Settings>(settings);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const isGoogle = formData.provider === 'google';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#0a0a0c] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-lg font-serif font-bold text-white tracking-wide">系统参数配置</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">AI 核心模型提供商</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, provider: 'google', model: 'gemini-3-pro-preview', baseUrl: ''})}
                className={`p-4 rounded-lg border text-sm font-medium transition-all ${
                  isGoogle 
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Google Gemini
                <span className="block text-[10px] opacity-60 mt-1 font-normal">支持原生搜索</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, provider: 'openai', model: 'gpt-4o', baseUrl: 'https://api.openai.com/v1'})}
                className={`p-4 rounded-lg border text-sm font-medium transition-all ${
                  !isGoogle 
                    ? 'bg-purple-600/10 border-purple-500 text-purple-400' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                OpenAI 兼容接口
                <span className="block text-[10px] opacity-60 mt-1 font-normal">自定义 Base URL</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest">
                API Key <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={e => setFormData({...formData, apiKey: e.target.value})}
                placeholder="sk-..."
                className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-800 font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest">
                接口地址 (Base URL)
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                placeholder={isGoogle ? "可选 (默认 Google 官方 API)" : "https://api.openai.com/v1"}
                disabled={isGoogle}
                className={`w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-800 font-mono ${isGoogle ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest">
                模型 ID (Model ID)
              </label>
              <input
                type="text"
                list="model-suggestions"
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
                placeholder="例如: gemini-3-pro-preview"
                className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-800 font-mono"
              />
              <datalist id="model-suggestions">
                {isGoogle ? (
                  <>
                    <option value="gemini-3-pro-preview" />
                    <option value="gemini-3-flash-preview" />
                    <option value="gemini-2.0-flash-thinking-exp-01-21" />
                  </>
                ) : (
                  <>
                    <option value="gpt-4o" />
                    <option value="gpt-3.5-turbo" />
                    <option value="deepseek-chat" />
                    <option value="deepseek-reasoner" />
                    <option value="claude-3-5-sonnet" />
                  </>
                )}
              </datalist>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              type="submit"
              className="w-full py-3 bg-white text-black font-bold font-mono uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              保存配置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;