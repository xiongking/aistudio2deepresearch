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

  return (
    <div className="h-full flex flex-col bg-[#050505] border-r border-white/5 relative overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.2em]">
          研究进程监控
        </h3>
        <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse delay-75"></div>
            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse delay-150"></div>
        </div>
      </div>
      
      {/* Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <div className="w-px h-16 bg-gradient-to-b from-transparent via-white to-transparent mb-4"></div>
             <p className="text-[10px] font-mono tracking-widest uppercase">等待任务指令</p>
          </div>
        )}
        
        {logs.map((log, idx) => (
          <div key={log.id} className="relative pl-6 group animate-in slide-in-from-left-2 fade-in duration-500">
            {/* Connecting Line */}
            <div className="absolute left-[3px] top-3 bottom-[-32px] w-px bg-white/5 group-last:hidden"></div>
            
            {/* Status Indicator */}
            <div className={`absolute left-0 top-1.5 w-[7px] h-[7px] rounded-sm rotate-45 border border-[#050505] shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
              log.type === 'error' ? 'bg-red-500' :
              log.type === 'writing' ? 'bg-emerald-400' :
              log.type === 'search' ? 'bg-blue-400' :
              log.type === 'plan' ? 'bg-purple-400' :
              'bg-gray-400'
            }`}></div>
            
            <div className="flex flex-col gap-1">
               <div className="flex items-center justify-between">
                 <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'plan' ? 'text-purple-300' :
                    log.type === 'search' ? 'text-blue-300' :
                    log.type === 'writing' ? 'text-emerald-300' :
                    'text-gray-500'
                 }`}>
                   {log.type}
                 </span>
                 <span className="text-[9px] text-gray-700 font-mono">
                   {new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}
                 </span>
               </div>
               
               <p className="text-xs text-gray-300 leading-relaxed font-light">
                 {log.message}
               </p>

               {log.details && Array.isArray(log.details) && (
                 <div className="mt-2 pl-2 border-l border-white/5 space-y-1">
                   {log.details.map((d: string, i: number) => (
                     <p key={i} className="text-[10px] text-gray-500 font-mono truncate">
                       {d}
                     </p>
                   ))}
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