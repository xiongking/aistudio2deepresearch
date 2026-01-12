import React, { useState } from 'react';
import { Sparkles, Telescope } from 'lucide-react';
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

  const startResearch = () => {
    if (state !== AppState.IDLE || !query.trim() || !depth) return;
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }
    onStart({ query, depth, breadth: 3 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startResearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startResearch();
    }
  };

  const isIdle = state === AppState.IDLE;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center relative z-20 px-4">
      
      {/* Hero Title - Editorial Style */}
      <div className="text-center mb-16 animate-slide-up flex flex-col items-center">
        {/* Telescope Icon Logo - Large for Hero */}
        <div className="mb-6 text-editorial-text p-4 bg-editorial-highlight rounded-full border border-editorial-border shadow-editorial-sm">
            <Telescope size={64} strokeWidth={1.2} />
        </div>
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
          
          <div className="relative bg-white border border-editorial-border shadow-editorial-sm hover:shadow-editorial-md transition-all duration-300 p-4 rounded-xl group-focus-within:border-editorial-accent group-focus-within:ring-1 group-focus-within:ring-editorial-accent flex flex-col gap-4">
            
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入一个研究主题，如：A股上市公司中国平安投资价值分析 or 商业航天深度研究"
              disabled={!isIdle}
              rows={3}
              className="w-full bg-transparent text-editorial-text text-lg font-sans placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
            />
            
            <div className="flex justify-end items-center gap-3">
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
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
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
                className="px-6 py-2 bg-editorial-accent text-white font-bold tracking-wider hover:bg-editorial-accentLight transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center justify-center gap-2 h-[38px]"
                >
                <span>开始</span>
                <Sparkles size={16} fill="currentColor" />
                </button>
            </div>
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