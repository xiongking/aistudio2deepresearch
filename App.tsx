import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ResearchForm from './components/ResearchForm';
import LogStream from './components/LogStream';
import ReportDisplay from './components/ReportDisplay';
import SettingsModal from './components/SettingsModal';
import HistoryDrawer from './components/HistoryDrawer';
import { DeepResearchService } from './services/geminiService';
import { ResearchConfig, ResearchLog, ResearchResult, AppState, Settings } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [logs, setLogs] = useState<ResearchLog[]>([]);
  const [accumulatedReport, setAccumulatedReport] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('深度研究报告');
  const [finalResult, setFinalResult] = useState<ResearchResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ResearchResult[]>([]);
  
  // Load settings
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem('ds_settings');
    if (stored) return JSON.parse(stored);
    return {
      provider: 'google',
      apiKey: process.env.API_KEY || '',
      baseUrl: '',
      model: 'gemini-3-pro-preview'
    };
  });

  const serviceRef = useRef<DeepResearchService>(new DeepResearchService());
  const previewRef = useRef<HTMLDivElement>(null);

  // Load History on Mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('ds_history');
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save History Helper
  const saveToHistory = (result: ResearchResult) => {
    const newHistory = [result, ...history].slice(0, 50); // Keep last 50
    setHistory(newHistory);
    localStorage.setItem('ds_history', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('ds_history', JSON.stringify(newHistory));
  };

  const loadFromHistory = (result: ResearchResult) => {
    setState(AppState.COMPLETE);
    setFinalResult(result);
    setLogs(result.logs || []); // Restore logs if available
    setReportTitle(result.title);
  };

  // Auto-scroll preview
  useEffect(() => {
    if (previewRef.current) {
        previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [accumulatedReport]);

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('ds_settings', JSON.stringify(newSettings));
  };

  const handleStartResearch = async (config: ResearchConfig) => {
    setState(AppState.RESEARCHING);
    setLogs([]);
    setAccumulatedReport('');
    setFinalResult(null);

    try {
      const generator = serviceRef.current.startResearch(config, settings);
      
      let currentLogs: ResearchLog[] = [];

      for await (const log of generator) {
        currentLogs.push(log);
        setLogs(prev => [...prev, log]);
        
        if (log.type === 'plan' && log.message.startsWith('核心架构已生成:')) {
            setReportTitle(log.message.replace('核心架构已生成: ', ''));
        }

        if (log.type === 'info' && log.details?.partialSection) {
            setAccumulatedReport(prev => prev + '\n\n' + log.details.partialSection);
        }

        if (log.type === 'info' && log.details?.completedResult) {
          const result = {
             ...log.details.completedResult,
             id: crypto.randomUUID(),
             timestamp: Date.now(),
             logs: currentLogs
          };
          setFinalResult(result);
          saveToHistory(result); // Auto save
        }
      }
      
      setState(AppState.COMPLETE);
    } catch (error: any) {
      console.error("Research failed", error);
      
      let errMsg = error.message || "未知错误";
      if (errMsg.includes("429") || errMsg.includes("quota")) {
        errMsg = "API 配额已耗尽 (429)。请在设置中检查您的 API 密钥。";
      }

      setLogs(prev => [...prev, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'error',
        message: `中断: ${errMsg}`
      }]);
      setState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setState(AppState.IDLE);
    setLogs([]);
    setAccumulatedReport('');
    setFinalResult(null);
  };

  return (
    <div className="h-screen bg-nebula text-gray-200 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
       <SettingsModal 
         isOpen={isSettingsOpen} 
         onClose={() => setIsSettingsOpen(false)}
         settings={settings}
         onSave={handleSaveSettings}
       />

       <HistoryDrawer 
         isOpen={isHistoryOpen}
         onClose={() => setIsHistoryOpen(false)}
         history={history}
         onSelect={loadFromHistory}
         onDelete={deleteHistoryItem}
       />

       {/* Top Navigation - Fixed Height */}
       <header className="flex-none flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#030303]/80 backdrop-blur-md z-40">
           <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
               <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all transform group-hover:scale-105">
                   <span className="font-serif font-bold text-white text-xl">D</span>
               </div>
               <span className="font-serif font-bold text-xl text-gray-200 tracking-wide hidden md:block group-hover:text-white transition-colors">
                 深度<span className="text-blue-500">研究</span>
               </span>
           </div>
           
           <div className="flex items-center gap-4">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="历史记录"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>

              <div className="h-4 w-px bg-white/10"></div>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded border border-transparent hover:border-white/10 transition-all"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${settings.provider === 'google' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <span className="uppercase">{settings.model || '未知模型'}</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
           </div>
       </header>

       {/* Main Layout - Flex 1 to fill remaining height */}
       <div className="flex-1 flex overflow-hidden relative">
          
          {/* IDLE VIEW Centered */}
          {state === AppState.IDLE && (
            <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                <ResearchForm 
                  onStart={handleStartResearch} 
                  state={state} 
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  hasApiKey={!!settings.apiKey}
                />
            </div>
          )}

          {/* SPLIT VIEW (Active) */}
          {state !== AppState.IDLE && (
            <>
                {/* Left: Log Stream (Sidebar) - Independent Scroll */}
                <div className={`w-full lg:w-[400px] border-r border-white/5 bg-[#030303]/90 backdrop-blur flex-none flex flex-col h-full ${state === AppState.COMPLETE ? 'hidden lg:flex' : 'flex'}`}>
                    <LogStream logs={logs} />
                </div>

                {/* Right: Content Area - Independent Scroll */}
                <div className={`flex-1 flex flex-col min-w-0 bg-[#020202] h-full ${state !== AppState.COMPLETE && 'hidden lg:flex'}`}>
                    
                    {state === AppState.RESEARCHING && (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Draft Header */}
                            <div className="flex-none px-8 py-3 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                                <div className="flex items-center gap-3">
                                  <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </div>
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">实时撰写中</span>
                                </div>
                            </div>

                            {/* Live Draft Scroll Area */}
                            <div ref={previewRef} className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-16 scroll-smooth">
                                {accumulatedReport ? (
                                    <div className="prose prose-invert prose-lg max-w-4xl mx-auto pb-20">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ({node, ...props}) => <table className="w-full text-left border-collapse border border-white/10 my-4" {...props} />,
                                                th: ({node, ...props}) => <th className="p-3 border border-white/10 bg-white/5 font-semibold text-gray-200" {...props} />,
                                                td: ({node, ...props}) => <td className="p-3 border border-white/10 text-gray-400" {...props} />,
                                                sup: ({node, ...props}) => <sup className="text-blue-400 font-bold ml-0.5" {...props} />
                                            }}
                                        >
                                            {accumulatedReport.replace(/\[([0-9]+)\]/g, '<sup>[$1]</sup>')}
                                        </ReactMarkdown>
                                        <div className="h-24 animate-pulse mt-8 bg-gradient-to-b from-transparent to-blue-500/5 rounded-b-lg border-b border-blue-500/20"></div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-6">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                                        </div>
                                        <p className="font-mono text-xs tracking-widest uppercase">初始化神经连接...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {state === AppState.COMPLETE && finalResult && (
                        <div className="h-full overflow-y-auto custom-scrollbar bg-white text-black w-full">
                            <ReportDisplay 
                                title={finalResult.title}
                                report={finalResult.report} 
                                sources={finalResult.sources} 
                                onReset={handleReset} 
                            />
                        </div>
                    )}
                    
                    {state === AppState.ERROR && (
                        <div className="flex-1 flex items-center justify-center p-6 h-full">
                            <div className="bg-[#0a0a0c] border border-red-500/30 p-8 rounded-xl text-center max-w-md shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                                <div className="text-4xl mb-4">⚠️</div>
                                <h2 className="text-red-400 text-lg font-bold font-mono uppercase mb-4 tracking-widest">协议中断</h2>
                                <p className="text-gray-400 text-sm mb-8 leading-relaxed font-light">{logs[logs.length-1]?.message}</p>
                                <div className="flex gap-4 justify-center">
                                    <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-mono uppercase tracking-wider transition-colors">
                                        检查配置
                                    </button>
                                    <button onClick={handleReset} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50 rounded text-xs font-mono uppercase tracking-wider transition-all">
                                        重试
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
          )}
       </div>
    </div>
  );
};

export default App;