import React, { useState } from 'react';
import { ResearchConfig, AppState } from '../types';

interface ResearchFormProps {
  onStart: (config: ResearchConfig) => void;
  state: AppState;
  onOpenSettings: () => void;
  hasApiKey: boolean;
}

const ResearchForm: React.FC<ResearchFormProps> = ({ onStart, state, onOpenSettings, hasApiKey }) => {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state === AppState.RESEARCHING || !query.trim()) return;
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }
    onStart({ query, depth, breadth: 3 });
  };

  const isResearching = state === AppState.RESEARCHING;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 flex flex-col items-center">
      
      {/* Hero Title */}
      <div className="text-center mb-16 animate-in slide-in-from-bottom-10 fade-in duration-1000">
        <h1 className="text-6xl md:text-8xl font-serif font-bold text-white mb-6 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          深度<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">研究</span>
        </h1>
        <div className="flex items-center justify-center gap-4 text-gray-500 text-xs md:text-sm font-mono tracking-[0.2em] uppercase">
           <span className="w-12 h-px bg-gray-800"></span>
           <span>全自动深度研究智能体</span>
           <span className="w-12 h-px bg-gray-800"></span>
        </div>
      </div>

      {/* Input Module */}
      <div className={`w-full relative group transition-all duration-700 ${isResearching ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        
        {/* Glow Container */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition duration-1000"></div>
        
        <div className="relative bg-[#050505] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入任何复杂的学术课题或研究假设..."
                disabled={isResearching}
                className="flex-1 bg-transparent text-white text-lg md:text-xl p-6 placeholder-gray-700 focus:outline-none font-light tracking-wide"
              />
              <button
                type="submit"
                disabled={isResearching || !query.trim()}
                className="m-2 p-4 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-0 disabled:translate-x-4 duration-300"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
            
            {/* Command Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-[#0a0a0c] border-t border-white/5">
              <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                 {[
                   { lvl: 1, label: "速览" },
                   { lvl: 2, label: "标准" },
                   { lvl: 3, label: "深度" }
                 ].map((opt) => (
                   <button
                     key={opt.lvl}
                     type="button"
                     onClick={() => setDepth(opt.lvl)}
                     className={`px-3 py-1 text-[10px] font-mono font-bold transition-all rounded ${
                       depth === opt.lvl ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'
                     }`}
                   >
                     {opt.label}
                   </button>
                 ))}
              </div>
              
              <button 
                type="button" 
                onClick={onOpenSettings}
                className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${!hasApiKey ? 'text-red-400 animate-pulse' : 'text-gray-600 hover:text-blue-400'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{hasApiKey ? '系统就绪' : '需要密钥'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResearchForm;