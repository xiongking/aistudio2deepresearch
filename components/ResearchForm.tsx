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
  const [depth, setDepth] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== AppState.IDLE || !query.trim() || !depth) return;
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }
    onStart({ query, depth, breadth: 3 });
  };

  const isIdle = state === AppState.IDLE;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center relative z-20 px-4">
      
      {/* Hero Title - Editorial Style */}
      <div className="text-center mb-16 animate-slide-up">
        <h1 className="text-6xl md:text-8xl font-sans font-black text-editorial-text mb-6 tracking-tight leading-none">
          深度<span className="text-editorial-accent">研究</span>
        </h1>
        <div className="flex items-center justify-center gap-4 mb-2">
            <span className="h-px w-12 bg-editorial-accent"></span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-editorial-subtext">Deep Research Agent</span>
            <span className="h-px w-12 bg-editorial-accent"></span>
        </div>
      </div>

      {/* Input Module */}
      <div className={`w-full transform transition-all duration-700 ease-out ${!isIdle ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        
        <form onSubmit={handleSubmit} className="relative group">
          
          <div className="relative bg-white border border-editorial-border shadow-editorial-sm hover:shadow-editorial-md transition-all duration-300 p-2 pl-4 flex items-center gap-2 group-focus-within:border-editorial-accent group-focus-within:ring-1 group-focus-within:ring-editorial-accent rounded-xl">
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="请输入研究课题..."
              disabled={!isIdle}
              className="flex-1 bg-transparent text-editorial-text text-lg font-sans py-4 px-2 placeholder-gray-400 focus:outline-none"
            />
            
            {/* Depth Selector inside Input */}
            <div className="flex bg-editorial-bg rounded-lg p-1 gap-1 border border-editorial-border">
               {[
                 { lvl: 1, label: "简报" },
                 { lvl: 2, label: "标准" },
                 { lvl: 3, label: "深度" }
               ].map((opt) => (
                 <button
                   key={opt.lvl}
                   type="button"
                   onClick={() => setDepth(opt.lvl)}
                   className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                     depth === opt.lvl 
                       ? 'bg-white text-editorial-accent shadow-sm' 
                       : 'text-gray-400 hover:text-editorial-text'
                   }`}
                 >
                   {opt.label}
                 </button>
               ))}
            </div>

            <button
              type="submit"
              disabled={!isIdle || !query.trim() || !depth}
              className="px-8 py-3 bg-editorial-accent text-white font-bold tracking-wider hover:bg-editorial-accentLight transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm"
            >
               开始
            </button>
          </div>
          
          {/* Validation Message */}
          {!depth && query.trim() && (
             <div className="absolute -bottom-8 left-0 w-full text-center">
                <span className="text-xs text-editorial-accent animate-pulse">请选择报告深度以继续</span>
             </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-end mt-4 px-2 gap-4">
            {/* Status Indicator */}
            <button 
              type="button" 
              onClick={onOpenSettings}
              className={`flex items-center gap-2 text-xs font-mono tracking-wider transition-colors border-b border-transparent hover:border-gray-300 pb-0.5 ${!hasApiKey ? 'text-red-500' : 'text-gray-400'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span>{hasApiKey ? '系统就绪' : '需配置 API KEY'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResearchForm;