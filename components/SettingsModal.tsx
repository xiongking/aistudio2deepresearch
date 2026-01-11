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
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleFetchModels = async () => {
    if (!formData.apiKey) {
      alert("请先输入 API Key");
      return;
    }
    
    setLoadingModels(true);
    try {
      // Logic for OpenAI compatible endpoint
      const baseUrl = formData.baseUrl || "https://api.openai.com/v1";
      const url = `${baseUrl.replace(/\/$/, '')}/models`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${formData.apiKey}`
        }
      });
      
      if (!response.ok) throw new Error("Fetch failed");
      
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id).sort();
        setFetchedModels(models);
        // If models found and current model not in list (or empty), select first
        if (models.length > 0 && !models.includes(formData.model)) {
          setFormData(prev => ({...prev, model: models[0]}));
        }
      } else {
        alert("未能识别模型列表格式");
      }
    } catch (e) {
      alert("获取模型列表失败，请检查 Base URL 和 API Key");
    } finally {
      setLoadingModels(false);
    }
  };

  const isGoogle = formData.provider === 'google';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-editorial-text/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white border border-editorial-border w-full max-w-lg shadow-editorial-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-editorial-border flex justify-between items-center bg-editorial-bg sticky top-0 z-10">
          <h2 className="font-serif text-xl font-bold text-editorial-text">系统配置</h2>
          <button 
            onClick={onClose}
            className="text-editorial-subtext hover:text-editorial-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          <div className="space-y-4">
            <label className="font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">AI 提供商</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, provider: 'google', model: 'gemini-3-pro-preview', baseUrl: ''})}
                className={`p-4 border text-sm font-sans font-medium transition-all ${
                  isGoogle 
                    ? 'bg-editorial-bg border-editorial-accent text-editorial-text shadow-sm' 
                    : 'bg-white border-editorial-border text-gray-400 hover:border-gray-300'
                }`}
              >
                Google Gemini
                <span className="block text-xs font-serif italic mt-1 text-editorial-subtext">原生搜索支持</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, provider: 'openai', model: 'gpt-4o', baseUrl: 'https://api.openai.com/v1'})}
                className={`p-4 border text-sm font-sans font-medium transition-all ${
                  !isGoogle 
                    ? 'bg-editorial-bg border-editorial-accent text-editorial-text shadow-sm' 
                    : 'bg-white border-editorial-border text-gray-400 hover:border-gray-300'
                }`}
              >
                OpenAI 兼容
                <span className="block text-xs font-serif italic mt-1 text-editorial-subtext">需配置搜索 API</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
             {/* Base URL (Top for OpenAI context) */}
            <div className="space-y-2">
              <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                Base URL
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                placeholder={isGoogle ? "默认 (Google API)" : "https://api.openai.com/v1"}
                disabled={isGoogle}
                className={`w-full bg-editorial-highlight border border-editorial-border px-4 py-3 text-editorial-text focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm ${isGoogle ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                LLM API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={e => setFormData({...formData, apiKey: e.target.value})}
                placeholder="LLM API Key"
                className="w-full bg-editorial-highlight border border-editorial-border px-4 py-3 text-editorial-text focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm"
                required
              />
            </div>

            {/* Model Selection with Auto-Fetch */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="block font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                   模型 ID
                </label>
                {!isGoogle && (
                  <button 
                    type="button" 
                    onClick={handleFetchModels}
                    disabled={loadingModels}
                    className="text-xs text-editorial-accent hover:underline mb-1"
                  >
                    {loadingModels ? '获取中...' : '自动获取模型列表'}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="model-suggestions"
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                  placeholder="例如: gemini-3-pro-preview"
                  className="w-full bg-editorial-highlight border border-editorial-border px-4 py-3 text-editorial-text focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm"
                />
                <datalist id="model-suggestions">
                  {fetchedModels.length > 0 ? (
                     fetchedModels.map(m => <option key={m} value={m} />)
                  ) : isGoogle ? (
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
                    </>
                  )}
                </datalist>
              </div>
            </div>

            {/* Tavily API Key Section - Moved to Bottom */}
            <div className="space-y-2 pt-4 border-t border-editorial-border">
               <label className="flex items-center justify-between font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest">
                  <span>Tavily Search API Key</span>
                  {!isGoogle && <span className="text-editorial-accent text-[10px]">推荐配置</span>}
               </label>
               <input
                type="password"
                value={formData.tavilyApiKey || ''}
                onChange={e => setFormData({...formData, tavilyApiKey: e.target.value})}
                placeholder={isGoogle ? "可选 (覆盖原生搜索)" : "强烈推荐用于联网搜索"}
                className="w-full bg-editorial-highlight border border-editorial-border px-4 py-3 text-editorial-text focus:border-editorial-accent focus:outline-none transition-all font-mono text-sm"
              />
              <p className="text-[10px] text-editorial-subtext font-sans mt-1">
                {isGoogle ? "Google 模型通常自带搜索，但您可以配置 Tavily 以使用外部搜索。" : "OpenAI 模型无内置搜索。请提供 Tavily API Key 以启用联网研究能力。"}
              </p>
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
               className="px-8 py-2.5 bg-editorial-text text-white font-sans text-sm font-medium hover:bg-black transition-all shadow-md"
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