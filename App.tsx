import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ResearchForm from './components/ResearchForm';
import LogStream from './components/LogStream';
import ReportDisplay from './components/ReportDisplay';
import SettingsModal from './components/SettingsModal';
import HistoryDrawer from './components/HistoryDrawer';
import OutlineEditor from './components/OutlineEditor';
import { DeepResearchService } from './services/geminiService';
import { ResearchConfig, ResearchLog, ResearchResult, AppState, Settings } from './types';

// Dynamic Loading Component
const ResearchLoader = ({ logs }: { logs: ResearchLog[] }) => {
  const [dots, setDots] = useState('.');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const lastLog = logs[logs.length - 1];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="relative w-24 h-24 mb-8">
         <div className="absolute inset-0 border-4 border-editorial-border rounded-full opacity-20"></div>
         <div className="absolute inset-0 border-4 border-t-editorial-accent border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
         <div className="absolute inset-4 border-2 border-dashed border-gray-300 rounded-full animate-spin-slow opacity-50"></div>
      </div>
      <h3 className="font-serif text-2xl text-editorial-text mb-2 animate-pulse">
        {lastLog?.type === 'search' ? '正在全网检索数据' : 
         lastLog?.type === 'writing' ? '正在撰写章节内容' : 
         lastLog?.type === 'analysis' ? '正在分析信息源' : '深度研究进行中'}
        {dots}
      </h3>
      <p className="font-mono text-xs text-editorial-subtext tracking-widest uppercase">
        {lastLog?.message || '初始化研究代理...'}
      </p>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [logs, setLogs] = useState<ResearchLog[]>([]);
  const [accumulatedReport, setAccumulatedReport] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('深度研究报告');
  const [finalResult, setFinalResult] = useState<ResearchResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ResearchResult[]>([]);
  
  // Interim State for Outline Approval
  const [pendingOutline, setPendingOutline] = useState<{ title: string, chapters: string[] } | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ResearchConfig | null>(null);

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

  // Step 1: Start -> Generate Outline
  const handleStartPlanning = async (config: ResearchConfig) => {
    setState(AppState.PLANNING);
    setCurrentConfig(config);
    setLogs([{
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'plan',
      message: '正在构建研究架构...'
    }]);
    setAccumulatedReport('');
    setFinalResult(null);

    try {
      const { title, chapters, usage } = await serviceRef.current.generateResearchPlan(config, settings);
      
      setPendingOutline({ title, chapters });
      setReportTitle(title);
      setLogs(prev => [...prev, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'plan',
        message: '大纲已生成，等待确认',
        tokenCount: usage
      }]);
      setState(AppState.OUTLINE_APPROVAL);
      
    } catch (error: any) {
      handleError(error);
    }
  };

  // Step 2: Approve -> Execute Research
  const handleApproveOutline = async (title: string, chapters: string[]) => {
    if (!currentConfig) return;
    
    setState(AppState.RESEARCHING);
    setReportTitle(title);
    
    try {
      const generator = serviceRef.current.executeResearch(currentConfig, settings, title, chapters);
      let currentLogs: ResearchLog[] = [...logs]; // Keep existing plan logs

      for await (const log of generator) {
        currentLogs.push(log);
        setLogs(prev => [...prev, log]);
        
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
      handleError(error);
    }
  };

  const handleCancelOutline = () => {
    setState(AppState.IDLE);
    setLogs([]);
    setCurrentConfig(null);
    setPendingOutline(null);
  };

  const handleError = (error: any) => {
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

  const handleReset = () => {
    setState(AppState.IDLE);
    setLogs([]);
    setAccumulatedReport('');
    setFinalResult(null);
    setPendingOutline(null);
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

       {/* Top Navigation */}
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
                  onStart={handleStartPlanning} 
                  state={state} 
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  hasApiKey={!!settings.apiKey}
                />
            </div>
          )}

          {/* PLANNING / APPROVAL VIEW */}
          {(state === AppState.PLANNING || state === AppState.OUTLINE_APPROVAL) && (
            <div className="absolute inset-0 flex items-center justify-center bg-editorial-bg z-20 overflow-y-auto">
               {state === AppState.PLANNING ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-editorial-border border-t-editorial-accent rounded-full animate-spin mb-6"></div>
                    <p className="font-serif text-lg text-editorial-text animate-pulse">正在构建研究架构...</p>
                  </div>
               ) : (
                  <OutlineEditor 
                    initialTitle={pendingOutline?.title || ''}
                    initialChapters={pendingOutline?.chapters || []}
                    onConfirm={handleApproveOutline}
                    onCancel={handleCancelOutline}
                  />
               )}
            </div>
          )}

          {/* ACTIVE RESEARCH & COMPLETE VIEW */}
          {(state === AppState.RESEARCHING || state === AppState.COMPLETE || state === AppState.ERROR) && (
            <div className="w-full h-full flex">
                {/* Sidebar (Log Stream) - Hidden on Complete if needed, or collapsed */}
                <div className={`w-full lg:w-[320px] bg-editorial-bg border-r border-editorial-border flex flex-col transition-all duration-500 ${state === AppState.COMPLETE ? 'hidden lg:flex' : 'flex'}`}>
                    <LogStream logs={logs} />
                </div>

                {/* Content Area */}
                <div className={`flex-1 bg-[#F5F3F0] overflow-hidden flex flex-col relative ${state !== AppState.COMPLETE && 'hidden lg:flex'}`}>
                    
                    {state === AppState.RESEARCHING && (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Live Preview Container */}
                            <div ref={previewRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
                                {accumulatedReport ? (
                                    <div className="max-w-4xl mx-auto p-12 md:p-16 bg-white shadow-editorial-lg min-h-screen my-8 border border-editorial-border/50">
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
                                                }}
                                            >
                                                {/* Strip citations for live preview clean look */}
                                                {accumulatedReport.replace(/\[([0-9]+)\]/g, '')}
                                            </ReactMarkdown>
                                        </div>
                                        <div className="h-32 flex items-center justify-center mt-12 border-t border-dashed border-editorial-border">
                                            <p className="text-xs font-mono text-editorial-subtext animate-pulse">正在撰写后续内容...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <ResearchLoader logs={logs} />
                                )}
                            </div>
                        </div>
                    )}

                    {state === AppState.COMPLETE && finalResult && (
                        <div className="h-full w-full bg-[#F5F3F0]">
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