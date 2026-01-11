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

  const saveToHistory = (result: ResearchResult) => {
    const newHistory = [result, ...history].slice(0, 50);
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
    setLogs(result.logs || []);
    setReportTitle(result.title);
  };

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
          saveToHistory(result);
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
    <div className="h-screen flex flex-col overflow-hidden font-sans selection:bg-editorial-accent/20 selection:text-editorial-text relative">
       
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

       {/* Top Navigation - Classical Header */}
       <header className="flex-none flex justify-between items-center px-8 py-5 z-40 bg-editorial-bg border-b border-editorial-border">
           <div className="flex items-center gap-4 cursor-pointer group" onClick={handleReset}>
               <div className="w-8 h-8 flex items-center justify-center border border-editorial-text rounded-sm transition-all group-hover:bg-editorial-text group-hover:text-white">
                   <span className="font-serif font-bold text-lg">D</span>
               </div>
               <div className="flex flex-col">
                   <span className="font-serif font-bold text-lg text-editorial-text leading-none tracking-tight">
                     深度研究
                   </span>
                   <span className="font-mono text-[10px] text-editorial-accent uppercase tracking-widest leading-none mt-1">
                     DeepSeeker Agent
                   </span>
               </div>
           </div>
           
           <div className="flex items-center gap-6">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="text-sm font-sans font-medium text-editorial-subtext hover:text-editorial-accent transition-colors flex items-center gap-2"
              >
                 <span className="font-serif italic">档案</span>
              </button>

              <div className="h-4 w-px bg-editorial-border"></div>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-editorial-subtext hover:text-editorial-text transition-colors"
              >
                <span>{settings.model || 'GEMINI'}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${settings.provider === 'google' ? 'bg-editorial-accent' : 'bg-gray-400'}`}></span>
              </button>
           </div>
       </header>

       {/* Main Layout */}
       <div className="flex-1 flex overflow-hidden relative z-10">
          
          {/* IDLE VIEW */}
          {state === AppState.IDLE && (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-editorial-bg">
                <ResearchForm 
                  onStart={handleStartResearch} 
                  state={state} 
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  hasApiKey={!!settings.apiKey}
                />
            </div>
          )}

          {/* ACTIVE VIEW */}
          {state !== AppState.IDLE && (
            <div className="w-full h-full flex">
                {/* Sidebar (Log Stream) - Fixed width, border right */}
                <div className={`w-full lg:w-[380px] bg-editorial-bg border-r border-editorial-border flex flex-col transition-all duration-500 ${state === AppState.COMPLETE ? 'hidden lg:flex' : 'flex'}`}>
                    <LogStream logs={logs} />
                </div>

                {/* Content Area - Scrollable paper */}
                <div className={`flex-1 bg-[#F5F3F0] overflow-hidden flex flex-col relative ${state !== AppState.COMPLETE && 'hidden lg:flex'}`}>
                    
                    {state === AppState.RESEARCHING && (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            <div className="flex-none px-12 py-4 bg-white border-b border-editorial-border flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-editorial-accent opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-editorial-accent"></span>
                                  </div>
                                  <span className="font-mono text-xs font-medium uppercase tracking-widest text-editorial-subtext">正在撰写报告初稿...</span>
                                </div>
                            </div>

                            <div ref={previewRef} className="flex-1 overflow-y-auto p-8 md:p-16 scroll-smooth bg-white max-w-5xl mx-auto w-full shadow-editorial-lg my-8">
                                {accumulatedReport ? (
                                    <div className="prose prose-lg max-w-none font-serif text-editorial-text">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({node, ...props}) => <h1 className="font-serif text-3xl font-bold border-b border-editorial-border pb-4 mb-6 mt-8" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="font-serif text-2xl font-bold text-editorial-text mt-8 mb-4 pl-0" {...props} />,
                                                p: ({node, ...props}) => <p className="font-sans text-editorial-text leading-relaxed mb-4 text-justify" {...props} />,
                                                table: ({node, ...props}) => <div className="overflow-x-auto my-8"><table className="w-full text-left border-collapse border-t-2 border-b-2 border-editorial-text" {...props} /></div>,
                                                th: ({node, ...props}) => <th className="p-3 bg-editorial-bg font-sans font-bold text-xs uppercase tracking-wider border-b border-editorial-border" {...props} />,
                                                td: ({node, ...props}) => <td className="p-3 border-b border-editorial-border font-sans text-sm" {...props} />,
                                                sup: ({node, ...props}) => <sup className="text-editorial-accent font-bold ml-0.5 font-sans" {...props} />
                                            }}
                                        >
                                            {accumulatedReport.replace(/\[([0-9]+)\]/g, '<sup>[$1]</sup>')}
                                        </ReactMarkdown>
                                        <div className="h-24 mt-8 flex justify-center">
                                            <div className="w-1.5 h-1.5 bg-editorial-accent rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-editorial-accent rounded-full animate-bounce delay-100 mx-1"></div>
                                            <div className="w-1.5 h-1.5 bg-editorial-accent rounded-full animate-bounce delay-200"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-50">
                                        <div className="w-12 h-12 border-2 border-editorial-border rounded-full border-t-editorial-accent animate-spin"></div>
                                        <p className="font-serif italic text-editorial-subtext">分析海量数据源中...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {state === AppState.COMPLETE && finalResult && (
                        <div className="h-full overflow-y-auto w-full custom-scrollbar bg-white">
                            <ReportDisplay 
                                title={finalResult.title}
                                report={finalResult.report} 
                                sources={finalResult.sources} 
                                onReset={handleReset} 
                            />
                        </div>
                    )}
                    
                    {state === AppState.ERROR && (
                        <div className="flex-1 flex items-center justify-center p-6 bg-editorial-bg">
                            <div className="bg-white border border-red-200 p-12 rounded-lg text-center max-w-md shadow-editorial-lg">
                                <div className="text-red-800 font-serif text-2xl mb-4 italic">流程中断</div>
                                <p className="text-editorial-subtext font-sans text-sm mb-8 leading-relaxed">{logs[logs.length-1]?.message}</p>
                                <div className="flex gap-4 justify-center">
                                    <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-2 border border-editorial-border text-editorial-text font-sans text-sm hover:bg-editorial-bg transition-colors">
                                        检查配置
                                    </button>
                                    <button onClick={handleReset} className="px-6 py-2 bg-red-800 text-white font-sans text-sm hover:bg-red-700 transition-colors">
                                        重试
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default App;