import React, { useEffect, useRef, useState } from 'react';
import { ResearchLog, Source } from '../types';
import { 
  Loader2, 
  Search, 
  BookOpen, 
  PenTool, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Globe, 
  FileDown, 
  FileText,
  Clock,
  Zap
} from 'lucide-react';

interface LogStreamProps {
  logs: ResearchLog[];
  totalSteps?: number;
  currentStep?: number;
  isComplete?: boolean;
  startTime?: number;
  finalStats?: { tokens: number; searchCount: number; wordCount?: number; duration?: number };
  reportData?: { title: string; report: string; sources: Source[] };
}

const LogStream: React.FC<LogStreamProps> = ({ logs, totalSteps = 0, currentStep = 0, isComplete, startTime, finalStats, reportData }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');
  const [estTime, setEstTime] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Timer Logic
  useEffect(() => {
    if (!startTime || isComplete) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isComplete]);

  // Est Time Logic
  useEffect(() => {
    if (isComplete) {
      setEstTime('');
      return;
    }
    if (totalSteps > 0 && currentStep > 0) {
       const remaining = totalSteps - currentStep;
       const mins = Math.ceil(remaining * 1.5); // Approx 1.5 min per chapter
       setEstTime(mins > 0 ? `+${mins}m` : '即将完成');
    }
  }, [totalSteps, currentStep, isComplete]);

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
     // Increase scale for better resolution in Word
     const scale = 4; 
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
      case 'plan': return { label: '构建计划', icon: <Loader2 size={16} className="text-editorial-text animate-spin-slow" /> };
      case 'search': return { label: '全网检索', icon: <Search size={16} className="text-blue-600" /> };
      case 'analysis': return { label: '分析数据', icon: <BookOpen size={16} className="text-purple-600" /> };
      case 'writing': return { label: '正在撰写', icon: <PenTool size={16} className="text-editorial-accent" /> };
      case 'error': return { label: '系统错误', icon: <AlertCircle size={16} className="text-red-500" /> };
      case 'info': return { label: '系统信息', icon: <Info size={16} className="text-gray-500" /> };
      default: return { label: '日志', icon: <Info size={16} className="text-gray-400" /> };
    }
  };

  const formatDuration = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}分${s}秒`;
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
      <div className="p-4 border-b border-editorial-border sticky top-0 z-10 bg-editorial-bg/95 backdrop-blur-sm">
        <h2 className="font-serif text-lg text-editorial-text font-bold mb-2">研究进程</h2>
        <div className="flex justify-between items-center text-xs font-mono text-editorial-subtext mt-1">
             <span className="uppercase tracking-widest">已用时</span>
             <div className="flex items-center gap-2">
                 <span className="font-bold text-editorial-text">{elapsedTime}</span>
                 {estTime && (
                    <>
                       <span className="text-gray-300">|</span>
                       <span className="text-[10px] text-editorial-accent animate-pulse">预计 {estTime}</span>
                    </>
                 )}
             </div>
        </div>
      </div>
      
      {/* Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
             <div className="w-px h-16 bg-editorial-border mb-4"></div>
             <p className="font-serif italic text-sm text-editorial-subtext">等待指令...</p>
          </div>
        )}
        
        {logs.map((log) => {
          const config = getTypeConfig(log.type);
          const hasSources = log.details && Array.isArray(log.details) && log.message.includes('发现源');
          const timeStr = new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'});

          return (
            <div key={log.id} className="relative pl-6 border-l border-editorial-border group animate-slide-up">
              {/* Icon Marker */}
              <div className="absolute left-[-9px] top-0 bg-editorial-bg z-10 p-0.5">
                  {config.icon}
              </div>
              
              <div className="flex flex-col gap-0.5 pt-0.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-sm font-bold tracking-tight text-editorial-text">
                      {config.label}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 flex-none ml-2">
                    {log.tokenCount ? <span className="text-editorial-subtext mr-1">{log.tokenCount} tokens /</span> : ''} 
                    {timeStr}
                  </span>
                </div>
                
                <p className={`font-sans text-xs leading-relaxed ${log.type === 'error' ? 'text-red-700' : 'text-editorial-text'}`}>
                  {log.message}
                </p>

                {/* Sources List - Always Visible */}
                {hasSources && (
                    <div className="mt-2 space-y-1 w-full bg-white/50 p-1.5 rounded border border-editorial-border/40">
                        {log.details.map((d: string, i: number) => {
                            const match = d.match(/🔗 (.*?) - (http.*)/);
                            if (match) {
                            return (
                                <a key={i} href={match[2]} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1 rounded hover:bg-white transition-colors group/link w-full">
                                    <img 
                                      src={getFaviconUrl(match[2])} 
                                      className="w-3 h-3 flex-none opacity-70"
                                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOViOUI5IiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+' }}
                                      alt="" 
                                    />
                                    <span className="text-[10px] font-sans text-editorial-subtext group-hover/link:text-editorial-text truncate leading-tight">
                                        {match[1]}
                                    </span>
                                </a>
                            )
                            }
                            return null;
                        })}
                    </div>
                )}

                {/* Other details */}
                {log.details && Array.isArray(log.details) && !log.message.includes('发现源') && (
                  <div className="mt-1 space-y-0.5">
                    {log.details.map((d: string, i: number) => (
                       <div key={i} className="pl-2 border-l border-editorial-border/50">
                             <p className="text-[10px] font-sans text-editorial-subtext truncate">{d}</p>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Completion Card */}
        {isComplete && finalStats && (
            <div className="relative pl-6 border-l border-editorial-border animate-slide-up pb-8">
                <div className="absolute left-[-9px] top-0 bg-editorial-bg z-10 p-0.5">
                    <CheckCircle2 size={16} className="text-editorial-accent" />
                </div>
                <div className="bg-editorial-highlight border border-editorial-border p-4 rounded shadow-sm mt-1">
                    <h3 className="font-serif font-bold text-sm mb-2 flex items-center gap-2 text-editorial-text">
                        <Zap size={14} className="text-editorial-accent fill-editorial-accent" /> 
                        研究任务已完成
                    </h3>
                    <div className="w-full h-px bg-editorial-border/60 my-2"></div>
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-[11px] font-mono font-bold text-editorial-text">
                            <span className="text-editorial-subtext">搜索调用</span>
                            <span>{finalStats.searchCount} 次</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-mono font-bold text-editorial-text">
                            <span className="text-editorial-subtext">消耗 Tokens</span>
                            <span>{finalStats.tokens.toLocaleString()}</span>
                        </div>
                        {finalStats.duration && (
                            <div className="flex justify-between items-center text-[11px] font-mono font-bold text-editorial-text">
                                <span className="text-editorial-subtext">研究总耗时</span>
                                <span>{formatDuration(finalStats.duration)}</span>
                            </div>
                        )}
                        {finalStats.wordCount !== undefined && (
                          <div className="flex justify-between items-center text-[11px] font-mono font-bold text-editorial-text pt-2 border-t border-editorial-border/50 mt-2">
                              <span className="text-editorial-subtext">报告总字数</span>
                              <span>{finalStats.wordCount.toLocaleString()} 字</span>
                          </div>
                        )}
                    </div>
                    
                    {/* Downloads */}
                    <div className="mt-4 pt-2 border-t border-editorial-border/50">
                        <p className="text-[10px] text-center text-editorial-subtext mb-2 tracking-wide">请点击下载报告</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={handleExportMarkdown}
                                className="flex flex-col items-center justify-center p-2 bg-white border border-editorial-border rounded hover:border-editorial-accent hover:shadow-sm transition-all group"
                                title="下载 Markdown"
                            >
                                <FileDown size={18} className="text-gray-400 group-hover:text-editorial-text mb-1" />
                                <span className="text-[9px] font-sans font-bold text-editorial-subtext group-hover:text-editorial-text">Markdown 格式</span>
                            </button>
                            <button 
                                onClick={handleExportWord}
                                disabled={isExporting}
                                className="flex flex-col items-center justify-center p-2 bg-white border border-editorial-border rounded hover:border-editorial-accent hover:shadow-sm transition-all group disabled:opacity-50"
                                title="下载 Word"
                            >
                                <FileText size={18} className="text-gray-400 group-hover:text-blue-600 mb-1" />
                                <span className="text-[9px] font-sans font-bold text-editorial-subtext group-hover:text-editorial-text">Word 格式</span>
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