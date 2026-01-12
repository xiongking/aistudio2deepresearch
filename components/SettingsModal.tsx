import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

// Icons for Vendors
const Icons = {
  deepseek: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 11l-2.5-1.25L12 11zm0 2.5l-5-2.5-5 2.5 10 5 10-5-5-2.5-5 2.5z"/></svg>,
  openai: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a1.54 1.54 0 0 1 .8312 1.32v5.6304a4.4944 4.4944 0 0 1-5.2877 3.1786zM6.0583 7.3557a4.4944 4.4944 0 0 1 5.3584-3.0118l-.0237.1419-1.9963 3.4566a.7948.7948 0 0 0-.0663.7193l2.394 6.273-2.0342 1.1686a1.54 1.54 0 0 1-2.2036-.5754L3.899 7.7919a4.4755 4.4755 0 0 1 2.1593-.4362zM2.263 12.0001a4.4944 4.4944 0 0 1 2.3701-4.1481l.1419.0805 4.7783 2.7582a.7948.7948 0 0 0 .7796.0142l6.0125-3.4756.0332 2.3392a1.54 1.54 0 0 1-.798 1.3769l-8.6806 5.0135a4.4755 4.4755 0 0 1-4.637-.9588zm10.7917-9.4005a4.4755 4.4755 0 0 1 3.522 1.961l-.1419.0805-4.7783 2.7582a.7948.7948 0 0 0-.3927.6813v6.7369l-2.02-1.1686a1.54 1.54 0 0 1-.8312-1.32V6.6985a4.4944 4.4944 0 0 1 4.6421-4.099zm8.5684 6.7844a1.54 1.54 0 0 1 .655 1.5941l-2.3656 8.5539a4.4755 4.4755 0 0 1-4.8878 3.1167l.0237-.1419 1.9963-3.4566a.7948.7948 0 0 0 .0663-.7193l-2.394-6.273 2.0342-1.1686a1.54 1.54 0 0 1 1.4878-.0754 4.4944 4.4944 0 0 1 3.3841 3.2505z"/></svg>,
  google: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>, // Generic
  other: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-500"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
};

const PRESETS = [
  { id: 'deepseek', name: 'DeepSeek (深度求索)', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', provider: 'openai', icon: Icons.deepseek },
  { id: 'google', name: 'Google Gemini', baseUrl: '', model: 'gemini-3-pro-preview', provider: 'google', icon: Icons.google },
  { id: 'zhipu', name: '智谱 AI (GLM-4)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4', provider: 'openai', icon: Icons.other },
  { id: 'minimax', name: 'MiniMax (海螺)', baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5-chat', provider: 'openai', icon: Icons.other },
  { id: 'qwen', name: '通义千问 (Aliyun)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo', provider: 'openai', icon: Icons.other },
  { id: 'moonshot', name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', provider: 'openai', icon: Icons.other },
  { id: 'yi', name: '零一万物 (Yi)', baseUrl: 'https://api.lingyiwanwu.com/v1', model: 'yi-34b-chat-0205', provider: 'openai', icon: Icons.other },
  { id: 'openai', name: 'OpenAI 兼容', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', provider: 'openai', icon: Icons.openai },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<Settings>(settings);
  // Default to deepseek if not set, or try to match existing
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
      const match = PRESETS.find(p => p.baseUrl === settings.baseUrl && p.model === settings.model && p.provider === settings.provider);
      return match ? match.id : 'deepseek';
  });
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.provider === 'openai') {
       if (!formData.baseUrl || !formData.apiKey || !formData.model || !formData.tavilyApiKey) {
           alert("使用自定义/OpenAI兼容模式时，接口地址、API Key、模型 ID 和 Tavily Search API Key 均为必填项。");
           return;
       }
    } else {
        if (!formData.apiKey) {
            alert("Google API Key 不能为空");
            return;
        }
    }
    onSave(formData);
    onClose();
  };

  const selectPreset = (id: string) => {
      setSelectedPresetId(id);
      const preset = PRESETS.find(p => p.id === id);
      if (preset) {
          setFormData(prev => ({
              ...prev,
              provider: preset.provider as 'google' | 'openai',
              baseUrl: preset.baseUrl,
              model: preset.model
          }));
      }
      setDropdownOpen(false);
  };

  const selectedPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
  const isGoogle = formData.provider === 'google';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-editorial-text/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white border border-editorial-border w-full max-w-lg shadow-editorial-lg animate-fade-in max-h-[90vh] overflow-y-auto rounded-md">
        <div className="p-6 border-b border-editorial-border flex justify-between items-center bg-editorial-bg sticky top-0 z-10">
          <h2 className="font-serif text-xl font-bold text-editorial-text">系统配置</h2>
          <button onClick={onClose} className="text-editorial-subtext hover:text-editorial-text transition-colors">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* AI Provider Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                {/* Flat AI Icon */}
                <svg className="w-6 h-6 text-editorial-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5L12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71L5 9.21v6.7zm14 0v-6.7l-6 3.38v6.71l6-3.38z"/></svg>
                <h3 className="font-serif font-bold text-lg text-editorial-text">AI 模型提供商</h3>
            </div>
            
            {/* Unified Preset Selector */}
            <div className="relative" ref={dropdownRef}>
                <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest mb-2">
                    快速预设
                </label>
                <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full bg-white border border-editorial-border px-4 py-3 text-editorial-text text-sm rounded flex items-center justify-between hover:border-editorial-accent focus:outline-none focus:border-editorial-accent transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {selectedPreset.icon}
                        <span className="font-medium">{selectedPreset.name}</span>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {dropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-editorial-border rounded shadow-lg max-h-60 overflow-y-auto">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => selectPreset(preset.id)}
                                className="w-full px-4 py-3 text-left hover:bg-editorial-highlight flex items-center gap-3 transition-colors border-b border-editorial-border/50 last:border-0"
                            >
                                {preset.icon}
                                <span className={`text-sm ${selectedPresetId === preset.id ? 'font-bold text-editorial-text' : 'text-editorial-subtext'}`}>{preset.name}</span>
                                {selectedPresetId === preset.id && <Check size={14} className="ml-auto text-editorial-accent"/>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Dynamic Fields based on Provider */}
            <div className="space-y-4 p-5 bg-gray-50 border border-editorial-border rounded-md animate-fade-in">
                {!isGoogle && (
                    <div className="space-y-2">
                        <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                            接口地址 (Base URL) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.baseUrl}
                            onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                            className="w-full bg-white border border-editorial-border px-3 py-2 text-editorial-text text-sm rounded focus:outline-none focus:border-editorial-accent font-mono"
                        />
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                        模型 ID (Model) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.model}
                        onChange={e => setFormData({...formData, model: e.target.value})}
                        className={`w-full bg-white border border-editorial-border px-3 py-2 text-editorial-text text-sm rounded focus:outline-none focus:border-editorial-accent font-mono ${isGoogle ? 'opacity-50' : ''}`}
                        readOnly={isGoogle}
                    />
                </div>
                
                <div className="space-y-2">
                  <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={e => setFormData({...formData, apiKey: e.target.value})}
                    placeholder={isGoogle ? "AIza..." : "sk-..."}
                    className="w-full bg-white border border-editorial-border px-4 py-3 text-editorial-text rounded focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm"
                    required
                  />
                </div>
            </div>
          </div>

          {/* Search Provider Section */}
          <div className="space-y-6 border-t-2 border-dashed border-editorial-border pt-8">
             <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <h3 className="font-serif font-bold text-lg text-editorial-text">搜索引擎提供商</h3>
            </div>

            <div className="space-y-2">
               <label className="flex items-center justify-between font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                  <span>Tavily Search API Key {!isGoogle && <span className="text-red-500">*</span>}</span>
               </label>
               <input
                type="password"
                value={formData.tavilyApiKey || ''}
                onChange={e => setFormData({...formData, tavilyApiKey: e.target.value})}
                placeholder="tvly-..."
                className="w-full bg-white border border-editorial-border px-4 py-3 text-editorial-text rounded focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm"
              />
              {!isGoogle && (
                <>
                  <p className="text-[10px] text-editorial-subtext mt-1">自定义模式下，必须配置 Tavily 才能进行联网检索。</p>
                  <p className="text-[10px] text-editorial-subtext mt-0.5">
                    Tavily API key 申请地址：<a href="https://app.tavily.com/home" target="_blank" rel="noreferrer" className="text-editorial-accent hover:underline">https://app.tavily.com/home</a>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-4 border-t border-editorial-border">
             <button
               type="button"
               onClick={onClose}
               className="px-6 py-2.5 text-editorial-subtext font-sans text-sm hover:text-editorial-text transition-colors"
             >
               取消
             </button>
             <button
               type="submit"
               className="px-8 py-2.5 bg-editorial-text text-white font-sans text-sm font-medium hover:bg-black transition-all shadow-md rounded"
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