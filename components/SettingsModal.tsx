import React, { useState } from 'react';
import { Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

const PRESETS = [
  { id: 'deepseek', name: 'DeepSeek (深度求索)', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { id: 'zhipu', name: '智谱 AI (GLM-4)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  { id: 'minimax', name: 'MiniMax (海螺)', baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5-chat' },
  { id: 'qwen', name: '通义千问 (Aliyun)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { id: 'yi', name: '零一万物 (Yi)', baseUrl: 'https://api.lingyiwanwu.com/v1', model: 'yi-34b-chat-0205' },
  { id: 'openai', name: 'OpenAI (GPT-4o)', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<Settings>(settings);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('deepseek');
  const [loadingModels, setLoadingModels] = useState(false);

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

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const pid = e.target.value;
      setSelectedPresetId(pid);
      const preset = PRESETS.find(p => p.id === pid);
      if (preset) {
          setFormData(prev => ({
              ...prev,
              baseUrl: preset.baseUrl,
              model: preset.model
          }));
      }
  };

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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* AI Provider Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-editorial-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <h3 className="font-serif font-bold text-lg text-editorial-text">AI 模型提供商</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <button
                type="button"
                onClick={() => setFormData({...formData, provider: 'openai'})}
                className={`p-3 text-sm font-sans font-medium transition-all border rounded-md ${
                  !isGoogle 
                    ? 'bg-editorial-highlight border-editorial-accent text-editorial-text shadow-sm' 
                    : 'bg-white border-editorial-border text-gray-400 hover:border-gray-300'
                }`}
              >
                自定义 / OpenAI 兼容
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, provider: 'google', model: 'gemini-3-pro-preview', baseUrl: ''})}
                className={`p-3 text-sm font-sans font-medium transition-all border rounded-md ${
                  isGoogle 
                    ? 'bg-editorial-highlight border-editorial-accent text-editorial-text shadow-sm' 
                    : 'bg-white border-editorial-border text-gray-400 hover:border-gray-300'
                }`}
              >
                Google Gemini
              </button>
            </div>

            {!isGoogle && (
                <div className="space-y-4 p-5 bg-gray-50 border border-editorial-border rounded-md">
                    <div className="space-y-2">
                        <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                            快速预设
                        </label>
                        <select 
                            value={selectedPresetId}
                            onChange={handlePresetChange}
                            className="w-full bg-white border border-editorial-border px-3 py-2 text-editorial-text text-sm rounded focus:outline-none focus:border-editorial-accent"
                        >
                            {PRESETS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

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
                    
                    <div className="space-y-2">
                        <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                            模型 ID (Model) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.model}
                            onChange={e => setFormData({...formData, model: e.target.value})}
                            className="w-full bg-white border border-editorial-border px-3 py-2 text-editorial-text text-sm rounded focus:outline-none focus:border-editorial-accent font-mono"
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
                        placeholder="sk-..."
                        className="w-full bg-white border border-editorial-border px-4 py-3 text-editorial-text rounded focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm"
                        required
                      />
                    </div>
                </div>
            )}

            {isGoogle && (
               <div className="space-y-2">
                  <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                    Google API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={e => setFormData({...formData, apiKey: e.target.value})}
                    placeholder="AIza..."
                    className="w-full bg-white border border-editorial-border px-4 py-3 text-editorial-text rounded focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm"
                    required
                  />
               </div>
            )}
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
              {!isGoogle && <p className="text-[10px] text-editorial-subtext mt-1">自定义模式下，必须配置 Tavily 才能进行联网检索。</p>}
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