import React, { useEffect, useRef, useState } from 'react';
import { ResearchLog, Source } from '../types';

interface LogStreamProps {
  logs: ResearchLog[];
  totalSteps?: number;
  currentStep?: number;
  isComplete?: boolean;
  finalStats?: { tokens: number; searchCount: number; wordCount?: number };
  reportData?: { title: string; report: string; sources: Source[] };
}

const LogStream: React.FC<LogStreamProps> = ({ logs, totalSteps = 0, currentStep = 0, isComplete, finalStats, reportData }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [estTime, setEstTime] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (isComplete) {
      setEstTime('');
      return;
    }
    if (totalSteps > 0 && currentStep > 0) {
       const remaining = totalSteps - currentStep;
       const mins = Math.ceil(remaining * 1.5);
       setEstTime(mins > 0 ? `预计剩余 ${mins} 分钟` : '即将完成');
    }
  }, [totalSteps, currentStep, isComplete]);

  const toggleLog = (id: string) => {
      const newSet = new Set(expandedLogs);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedLogs(newSet);
  };

  // Export Logic
  const handleExportMarkdown = () => {
    if (!reportData) return;
    const { title, report, sources } = reportData;
    const sourceText = sources.length > 0 
       ? `\n\n# 参考文献与数据源\n` + sources.map((s, i) => `${i+1}. [${s.title}](${s.uri})`).join('\n')
       : '';
    
    const blob = new Blob([report + sourceText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.md`;
    link.click();
  };

  const convertSvgToPng = async (svgElement: SVGSVGElement): Promise<string> => {
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');
     const svgData = new XMLSerializer().serializeToString(svgElement);
     const img = new Image();
     const box = svgElement.getBoundingClientRect();
     const scale = 2; 
     canvas.width = (box.width || 800) * scale;
     canvas.height = (box.height || 600) * scale;
     return new Promise((resolve) => {
       img.onload = () => {
         if(ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(img,0,0,canvas.width,canvas.height);
            resolve(canvas.toDataURL('image/png'));
         }
       };
       img.onerror = () => resolve('');
       img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
     });
  };

  const handleExportWord = async () => {
    if (!reportData) return;
    setIsExporting(true);
    const container = document.getElementById('report-container');
    if (!container) {
        setIsExporting(false);
        return;
    }

    const clone = container.cloneNode(true) as HTMLElement;
    
    const mermaidDivs = clone.querySelectorAll('.mermaid');
    const originalMermaids = container.querySelectorAll('.mermaid svg'); 
    for (let i = 0; i < mermaidDivs.length; i++) {
        const div = mermaidDivs[i];
        const originalSvg = originalMermaids[i] as SVGSVGElement;
        if (originalSvg) {
            const pngData = await convertSvgToPng(originalSvg);
            if(pngData) {
                div.innerHTML = `<img src="${pngData}" style="width:100%;" />`;
            }
        }
    }

    const imgs = clone.querySelectorAll('img');
    imgs.forEach(img => {
        if (!img.src || img.src.startsWith('https://www.google.com/s2/favicons')) {
            img.style.width = '12px';
            img.style.height = '12px';
            img.style.verticalAlign = 'middle';
        }
    });

    const content = clone.innerHTML;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${reportData.title}</title><style>body{font-family:'Times New Roman',serif; font-size:12pt;} h1,h2,h3{font-family:'Arial',sans-serif; color:#333;} table{border-collapse:collapse;width:100%;border:1px solid #000;} td,th{border:1px solid #000;padding:8px;} tr:nth-child(even){background-color:#f2f2f2;} a{text-decoration:none; color:#B8860B;}</style></head><body>`;
    const footer = "</body></html>";
    const blob = new Blob([header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title.replace(/\s+/g, '_')}.doc`;
    link.click();
    setIsExporting(false);
  };

  const getTypeConfig = (type: string) => {
    switch(type) {
      case 'plan': return { label: '构建计划', icon: <svg className="w-5 h-5 text-editorial-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> };
      case 'search': return { label: '全网检索', icon: <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> };
      case 'analysis': return { label: '分析数据', icon: <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> };
      case 'writing': return { label: '正在撰写', icon: <svg className="w-5 h-5 text-editorial-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> };
      case 'error': return { label: '系统错误', icon: <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> };
      case 'info': return { label: '系统信息', icon: <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
      default: return { label: '日志', icon: <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" /></svg> };
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
      <div className="p-6 border-b border-editorial-border sticky top-0 z-10 bg-editorial-bg/95 backdrop-blur-sm">
        <h2 className="font-serif text-xl text-editorial-text font-bold mb-1">研究进程</h2>
        <div className="flex justify-between items-center">
             <span className="font-mono text-[10px] font-medium text-editorial-subtext tracking-widest uppercase">Research Log</span>
             {estTime && <span className="font-mono text-[10px] text-editorial-accent animate-pulse">{estTime}</span>}
        </div>
      </div>
      
      {/* Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
             <div className="w-px h-16 bg-editorial-border mb-4"></div>
             <p className="font-serif italic text-editorial-subtext">等待指令...</p>
          </div>
        )}
        
        {logs.map((log, idx) => {
          const config = getTypeConfig(log.type);
          const hasSources = log.details && Array.isArray(log.details) && log.message.includes('发现源');
          const isExpanded = expandedLogs.has(log.id);

          return (
            <div key={log.id} className="relative pl-8 border-l border-editorial-border group animate-slide-up">
              {/* Icon replace dot */}
              <div className="absolute left-[-11px] top-0 bg-editorial-bg z-10 p-0.5">
                  {config.icon}
              </div>
              
              <div className="flex flex-col gap-2 pt-0.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-base font-bold tracking-tight text-editorial-text">
                      {config.label}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 flex-none ml-2">
                    {new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                  </span>
                </div>
                
                <p className={`font-sans text-sm leading-relaxed ${log.type === 'error' ? 'text-red-700' : 'text-editorial-text'}`}>
                  {log.message}
                </p>

                {log.tokenCount !== undefined && log.tokenCount > 0 && (
                   <div className="flex">
                      <span className="font-mono text-[10px] text-editorial-subtext opacity-70 bg-gray-100 px-1.5 py-0.5 rounded">
                        {log.tokenCount} Tokens
                      </span>
                   </div>
                )}

                {/* Sources Collapsible */}
                {hasSources && (
                    <div className="mt-2 w-full">
                         <button 
                            onClick={() => toggleLog(log.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-editorial-border rounded-md text-xs font-mono text-editorial-subtext hover:border-editorial-accent hover:text-editorial-text transition-all w-full"
                         >
                            <span>{isExpanded ? '收起来源' : '展开来源详情'}</span>
                            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                         </button>
                         {isExpanded && (
                             <div className="mt-2 space-y-1 bg-white p-2 rounded-md border border-editorial-border shadow-sm w-full">
                                {log.details.map((d: string, i: number) => {
                                  const match = d.match(/🔗 (.*?) - (http.*)/);
                                  if (match) {
                                    return (
                                        <a key={i} href={match[2]} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1.5 rounded hover:bg-editorial-highlight transition-colors group/link w-full">
                                        <img src={getFaviconUrl(match[2])} alt="" className="w-3.5 h-3.5 rounded-sm opacity-70 group-hover/link:opacity-100 flex-none" />
                                        {/* Allow text to wrap naturally if space permits, or truncate if narrow */}
                                        <span className="text-xs font-sans text-editorial-text underline decoration-transparent group-hover/link:decoration-editorial-border break-words leading-tight">{match[1]}</span>
                                        </a>
                                    )
                                  }
                                  return null;
                                })}
                             </div>
                         )}
                    </div>
                )}

                {/* Other details that are not sources */}
                {log.details && Array.isArray(log.details) && !log.message.includes('发现源') && (
                  <div className="mt-2 space-y-1">
                    {log.details.map((d: string, i: number) => (
                       <div key={i} className="pl-3 border-l border-editorial-border/50">
                             <p className="text-xs font-sans text-editorial-subtext truncate max-w-[200px]">{d}</p>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Completion Card with Downloads */}
        {isComplete && finalStats && (
            <div className="relative pl-8 border-l border-editorial-border animate-slide-up pb-8">
                <div className="absolute left-[-11px] top-0 bg-editorial-bg z-10 p-0.5">
                    <svg className="w-5 h-5 text-editorial-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="bg-editorial-highlight border border-editorial-border p-5 rounded shadow-sm mt-1">
                    <h3 className="font-serif font-bold text-lg mb-1 flex items-center gap-2 text-editorial-text">
                        <span className="text-editorial-accent">✦</span> 研究任务已完成
                    </h3>
                    <div className="w-full h-px bg-editorial-border/60 my-3"></div>
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-xs font-mono text-editorial-subtext">
                            <span>搜索调用</span>
                            <span>{finalStats.searchCount} 次</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono text-editorial-subtext">
                            <span>消耗 Tokens</span>
                            <span>{finalStats.tokens.toLocaleString()}</span>
                        </div>
                        {finalStats.wordCount !== undefined && (
                          <div className="flex justify-between text-xs font-mono text-editorial-subtext font-bold">
                              <span>报告字数</span>
                              <span>{finalStats.wordCount.toLocaleString()} 字</span>
                          </div>
                        )}
                    </div>
                    
                    {/* Download Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-editorial-text/60">
                            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest">点击下载报告</span>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleExportMarkdown}
                                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-white border border-editorial-border rounded hover:border-editorial-accent hover:shadow-md transition-all group"
                                title="下载 Markdown"
                            >
                                <svg className="w-6 h-6 text-gray-400 group-hover:text-editorial-text transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="text-[10px] font-mono text-editorial-subtext group-hover:text-editorial-text font-bold">MARKDOWN</span>
                            </button>
                            <button 
                                onClick={handleExportWord}
                                disabled={isExporting}
                                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-white border border-editorial-border rounded hover:border-editorial-accent hover:shadow-md transition-all group disabled:opacity-50"
                                title="下载 Word"
                            >
                                <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                <span className="text-[10px] font-mono text-editorial-subtext group-hover:text-editorial-text font-bold">{isExporting ? '生成中...' : 'WORD DOC'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};

export default LogStream;