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
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center relative z-20 px-4">
      
      {/* Hero Title - Editorial Style */}
      <div className="text-center mb-16 animate-slide-up">
        <h1 className="text-5xl md:text-7xl font-serif font-normal text-editorial-text mb-6 tracking-tight leading-none">
          深度<span className="italic text-editorial-accent">研究</span>
        </h1>
        <div className="flex items-center justify-center gap-4 mb-6">
            <span className="h-px w-12 bg-editorial-accent"></span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-editorial-subtext">Deep Research Agent</span>
            <span className="h-px w-12 bg-editorial-accent"></span>
        </div>
        <p className="text-editorial-subtext font-serif italic text-xl max-w-lg mx-auto leading-relaxed">
          您的个人学术研究助理。基于实时数据，为您生成博士级深度分析报告。
        </p>
      </div>

      {/* Input Module - Minimalist Box */}
      <div className={`w-full transform transition-all duration-700 ease-out ${isResearching ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        
        <form onSubmit={handleSubmit} className="relative group">
          
          <div className="relative bg-white border border-editorial-border shadow-editorial-sm hover:shadow-editorial-md transition-all duration-300 p-2 pl-6 flex items-center gap-4 group-focus-within:border-editorial-accent group-focus-within:ring-1 group-focus-within:ring-editorial-accent rounded-lg">
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="请输入研究课题..."
              disabled={isResearching}
              className="flex-1 bg-transparent text-editorial-text text-lg font-sans py-4 placeholder-gray-400 focus:outline-none"
            />
            
            <button
              type="submit"
              disabled={isResearching || !query.trim()}
              className="px-8 py-3 bg-editorial-accent text-white font-serif tracking-wider font-medium hover:bg-editorial-accentLight transition-colors disabled:opacity-50 rounded-md"
            >
               开始
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between mt-8 px-2 gap-4">
            
            {/* Depth Selection - Text Based */}
            <div className="flex items-center gap-6">
               <span className="font-mono text-xs uppercase tracking-widest text-gray-400">报告深度</span>
               <div className="flex gap-4">
                 {[
                   { lvl: 1, label: "简报" },
                   { lvl: 2, label: "标准" },
                   { lvl: 3, label: "深度" }
                 ].map((opt) => (
                   <button
                     key={opt.lvl}
                     type="button"
                     onClick={() => setDepth(opt.lvl)}
                     className={`text-sm font-sans transition-all pb-0.5 border-b-2 ${
                       depth === opt.lvl 
                         ? 'text-editorial-accent border-editorial-accent font-medium' 
                         : 'text-gray-400 border-transparent hover:text-editorial-text'
                     }`}
                   >
                     {opt.label}
                   </button>
                 ))}
               </div>
            </div>
            
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