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

  // Translate log types
  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'plan': return '计划';
      case 'search': return '搜索';
      case 'analysis': return '分析';
      case 'writing': return '撰写';
      case 'error': return '错误';
      case 'info': return '信息';
      default: return '日志';
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-editorial-bg">
      {/* Header */}
      <div className="p-8 border-b border-editorial-border sticky top-0 z-10 bg-editorial-bg/95 backdrop-blur-sm">
        <h3 className="font-mono text-xs font-medium text-editorial-accent tracking-[0.2em] uppercase mb-2">
          Research Log
        </h3>
        <h2 className="font-serif text-xl text-editorial-text">研究进程</h2>
      </div>
      
      {/* Stream */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
             <div className="w-px h-16 bg-editorial-border mb-4"></div>
             <p className="font-serif italic text-editorial-subtext">等待指令...</p>
          </div>
        )}
        
        {logs.map((log, idx) => (
          <div key={log.id} className="relative pl-6 border-l border-editorial-border group animate-slide-up">
            {/* Active Indicator */}
            <div className={`absolute left-[-3px] top-2 w-[5px] h-[5px] rounded-full bg-editorial-bg border border-editorial-accent z-10 ${idx === logs.length - 1 ? 'bg-editorial-accent scale-125' : ''}`}></div>
            
            <div className="flex flex-col gap-2">
               <div className="flex items-baseline justify-between">
                 <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-editorial-subtext uppercase tracking-widest">
                        {getTypeLabel(log.type)}
                    </span>
                    {log.tokenCount !== undefined && log.tokenCount > 0 && (
                        <span className="font-mono text-[10px] text-editorial-accent/70 bg-editorial-accent/5 px-1.5 py-0.5 rounded">
                            {log.tokenCount} Tokens
                        </span>
                    )}
                 </div>
                 <span className="font-mono text-[10px] text-gray-400">
                   {new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                 </span>
               </div>
               
               <p className={`font-serif text-sm leading-relaxed ${log.type === 'error' ? 'text-red-700' : 'text-editorial-text'}`}>
                 {log.message}
               </p>

               {/* Details / Sources List */}
               {log.details && Array.isArray(log.details) && (
                 <div className="mt-3 pl-3 border-l-2 border-editorial-border/50 space-y-2">
                   {log.details.map((d: string, i: number) => {
                     // Check if details look like a link or source
                     const isLink = d.startsWith('🔗');
                     return (
                        <p key={i} className={`text-xs font-sans ${isLink ? 'text-editorial-accent underline underline-offset-2' : 'text-editorial-subtext'} truncate`}>
                            {d}
                        </p>
                     );
                   })}
                 </div>
               )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};

export default LogStream;