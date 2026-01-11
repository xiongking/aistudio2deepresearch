import React, { useEffect, useRef } from 'react';
import { ResearchLog } from '../types';

interface LogStreamProps {
  logs: ResearchLog[];
}

const LogStream: React.FC<LogStreamProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Translate log types & Icons
  const getTypeConfig = (type: string) => {
    switch(type) {
      case 'plan': return { label: '计划构建', icon: '📐' };
      case 'search': return { label: '深度搜索', icon: '🔍' };
      case 'analysis': return { label: '数据分析', icon: '🧠' };
      case 'writing': return { label: '正在撰写', icon: '✍️' };
      case 'error': return { label: '系统错误', icon: '⚠️' };
      case 'info': return { label: '系统信息', icon: 'ℹ️' };
      default: return { label: '日志', icon: '📝' };
    }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-editorial-bg">
      {/* Header */}
      <div className="p-8 border-b border-editorial-border sticky top-0 z-10 bg-editorial-bg/95 backdrop-blur-sm">
        <h3 className="font-mono text-xs font-medium text-editorial-accent tracking-[0.2em] uppercase mb-2">
          Research Log
        </h3>
        <h2 className="font-serif text-2xl text-editorial-text font-bold">研究进程</h2>
      </div>
      
      {/* Stream */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
             <div className="w-px h-16 bg-editorial-border mb-4"></div>
             <p className="font-serif italic text-editorial-subtext">等待指令...</p>
          </div>
        )}
        
        {logs.map((log, idx) => {
          const config = getTypeConfig(log.type);
          return (
            <div key={log.id} className="relative pl-8 border-l border-editorial-border group animate-slide-up">
              {/* Active Indicator */}
              <div className={`absolute left-[-5px] top-1 w-[9px] h-[9px] rounded-full bg-editorial-bg border-2 border-editorial-accent z-10 ${idx === logs.length - 1 ? 'bg-editorial-accent scale-125' : ''}`}></div>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <span className="text-xl">{config.icon}</span>
                      <span className="font-serif text-lg font-bold text-editorial-text tracking-tight">
                          {config.label}
                      </span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                  </span>
                </div>
                
                <p className={`font-sans text-sm leading-relaxed ${log.type === 'error' ? 'text-red-700' : 'text-editorial-text'}`}>
                  {log.message}
                </p>

                {/* Token Count Badge */}
                {log.tokenCount !== undefined && log.tokenCount > 0 && (
                   <div className="flex">
                      <span className="font-mono text-[10px] text-editorial-accent/80 bg-editorial-accent/5 px-2 py-1 rounded border border-editorial-accent/10">
                        ⚡ {log.tokenCount} Tokens
                      </span>
                   </div>
                )}

                {/* Details / Sources List - Clickable Favicon Style */}
                {log.details && Array.isArray(log.details) && (
                  <div className="mt-2 space-y-2">
                    {log.details.map((d: string, i: number) => {
                      const isLink = d.startsWith('🔗');
                      
                      if (isLink) {
                        // Extract Title and URL: "🔗 Title - URL"
                        const match = d.match(/🔗 (.*?) - (http.*)/);
                        if (match) {
                           const title = match[1];
                           const url = match[2];
                           const favicon = getFaviconUrl(url);

                           return (
                             <a 
                               key={i} 
                               href={url} 
                               target="_blank" 
                               rel="noreferrer"
                               className="flex items-center gap-2 p-2 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-editorial-border transition-all group/link"
                             >
                               {favicon && <img src={favicon} alt="" className="w-4 h-4 rounded-sm opacity-70 group-hover/link:opacity-100" />}
                               <span className="text-xs font-sans text-editorial-text truncate underline decoration-editorial-border underline-offset-2 group-hover/link:decoration-editorial-accent">
                                 {title}
                               </span>
                               <svg className="w-3 h-3 text-editorial-subtext opacity-0 group-hover/link:opacity-100 transition-opacity ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </a>
                           )
                        }
                      }

                      // Standard Detail
                      return (
                         <div key={i} className="pl-3 border-l-2 border-editorial-border/50">
                             <p className="text-xs font-sans text-editorial-subtext truncate">
                                 {d}
                             </p>
                         </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};

export default LogStream;