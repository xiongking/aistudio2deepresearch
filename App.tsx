import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Telescope, History, SquarePen, Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  
  // Logic for Time Estimation
  const [totalChapters, setTotalChapters] = useState(0);
  const [completedChapters, setCompletedChapters] = useState(0);
  
  // Interim State for Outline Approval
  const [pendingOutline, setPendingOutline] = useState<{ title: string, chapters: string[] } | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ResearchConfig | null>(null);

  // Sidebar Resizing State (Left - Log Stream)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(380);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const isResizingLeft = useRef(false);

  // Load settings
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem('ds_settings');
    if (stored) return JSON.parse(stored);
    return {
      provider: 'openai',
      apiKey: '',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat'
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

  // Split Pane Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingLeft.current) return;
      if (e.clientX > 250 && e.clientX < 800) {
        setLeftSidebarWidth(e.clientX);
      }
    };
    const handleMouseUp = () => {
      isResizingLeft.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
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
    setCurrentConfig({ query: result.title, depth: 3, breadth: 3 }); 
    setStartTime(result.timestamp); // Use historical timestamp for display
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
    setCompletedChapters(0);
    setStartTime(Date.now()); // Initialize start time

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

  const handleApproveOutline = async (title: string, chapters: string[]) => {
    if (!currentConfig) return;
    
    // Update logs to reflect approved outline
    setLogs(prev => [...prev, {
       id: crypto.randomUUID(),
       timestamp: Date.now(),
       type: 'plan',
       message: `架构已确认，包含 ${chapters.length} 个章节`,
       details: chapters
    }]);

    setState(AppState.RESEARCHING);
    setReportTitle(title);
    setTotalChapters(chapters.length);
    // Reset Start Time for accurate "Research Duration" if user spent time editing outline
    // Or keep it from planning. Let's keep from planning to count total effort.
    
    try {
      const generator = serviceRef.current.executeResearch(currentConfig, settings, title, chapters);
      let currentLogs: ResearchLog[] = [...logs]; 

      for await (const log of generator) {
        currentLogs.push(log);
        setLogs(prev => [...prev, log]);
        
        // Track Progress
        if (log.type === 'info' && log.message.includes('完成')) {
            setCompletedChapters(prev => prev + 1);
        }

        if (log.type === 'info' && log.details?.partialSection) {
            setAccumulatedReport(prev => prev + '\n\n' + log.details.partialSection);
        }

        if (log.type === 'info' && log.details?.completedResult) {
          const endTime = Date.now();
          const result = {
             ...log.details.completedResult,
             id: crypto.randomUUID(),
             timestamp: endTime, // Use end time for record? or start? Record uses timestamp for ID usually.
             startTime: startTime,
             endTime: endTime,
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
    setCurrentConfig(null);
    setStartTime(undefined);
  };

  // Determine if we show the sidebars based on state
  const showSidebar = state === AppState.RESEARCHING || state === AppState.COMPLETE || state === AppState.ERROR;

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
       <header className="flex-none flex justify-between items-center px-8 py-4 z-40 bg-editorial-bg border-b border-editorial-border">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
                  {/* Brain Logo - Lucide Icon */}
                  <div className="text-editorial-text transition-transform group-hover:scale-110">
                      <Telescope size={32} strokeWidth={1.5} />
                  </div>
                  {/* Branding Text - Hide when researching */}
                  {state === AppState.IDLE && (
                    <div className="flex flex-col animate-fade-in">
                        <span className="font-sans font-black text-xl text-editorial-text leading-none tracking-tight">
                          深度研究
                        </span>
                    </div>
                  )}
              </div>

              {/* Current Topic Display */}
              {currentConfig?.query && state !== AppState.IDLE && (
                 <div className="hidden md:flex items-center text-sm font-serif text-editorial-text border-l border-editorial-border pl-6 max-w-lg truncate animate-fade-in">
                    <span className="text-editorial-accent mr-2 italic">
                       {state === AppState.COMPLETE ? '研究完成:' : '正在研究:'}
                    </span>
                    <span className="truncate font-medium">{currentConfig.query}</span>
                 </div>
              )}
           </div>
           
           <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 text-editorial-subtext hover:text-editorial-accent hover:bg-editorial-highlight rounded-md transition-all"
                title="历史记录"
              >
                 <History size={20} strokeWidth={1.5} />
              </button>
              
              <button 
                onClick={handleReset}
                className="p-2 text-editorial-subtext hover:text-editorial-accent hover:bg-editorial-highlight rounded-md transition-all"
                title="新研究"
              >
                 <SquarePen size={20} strokeWidth={1.5} />
              </button>

              <div className="h-6 w-px bg-editorial-border mx-1"></div>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-2 py-1.5 text-editorial-subtext hover:text-editorial-text rounded-md transition-all group"
                title="系统配置"
              >
                <SettingsIcon size={20} strokeWidth={1.5} className="group-hover:rotate-45 transition-transform duration-500"/>
                <span className={`w-2 h-2 rounded-full ${settings.provider === 'google' ? 'bg-editorial-accent' : 'bg-green-500'}`}></span>
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
          {showSidebar && (
            <>
                {/* Left Sidebar (Log Stream) */}
                <div 
                  style={{ width: isLeftSidebarOpen ? leftSidebarWidth : 0 }}
                  className={`flex-none bg-editorial-bg border-r border-editorial-border flex flex-col h-full transition-[width] duration-300 relative ${isLeftSidebarOpen ? 'overflow-visible' : 'overflow-hidden'}`}
                >
                    <div className="h-full overflow-hidden w-full">
                         <LogStream 
                            logs={logs} 
                            totalSteps={totalChapters} 
                            currentStep={completedChapters}
                            isComplete={state === AppState.COMPLETE}
                            startTime={startTime}
                            finalStats={finalResult ? { 
                                tokens: finalResult.totalTokens || 0, 
                                searchCount: finalResult.totalSearchQueries || 0, 
                                wordCount: finalResult.wordCount,
                                duration: (finalResult as any).endTime && (finalResult as any).startTime ? (finalResult as any).endTime - (finalResult as any).startTime : undefined
                            } : undefined}
                            reportData={finalResult ? { title: finalResult.title, report: finalResult.report, sources: finalResult.sources } : undefined}
                        />
                    </div>
                </div>

                 {/* Left Sidebar Toggle (Fixed position when closed, or relative to sidebar when open) */}
                 {state === AppState.COMPLETE && (
                    <button
                        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                        className={`absolute z-30 top-1/2 transform -translate-y-1/2 bg-white border border-editorial-border shadow-md py-3 pr-1 pl-1 rounded-r-md hover:bg-editorial-highlight transition-all duration-300 group`}
                        style={{ left: isLeftSidebarOpen ? leftSidebarWidth : 0 }}
                        title={isLeftSidebarOpen ? "收起日志" : "展开日志"}
                    >
                         {isLeftSidebarOpen ? <PanelLeftClose size={14} className="text-editorial-subtext"/> : <PanelLeftOpen size={14} className="text-editorial-accent"/>}
                    </button>
                 )}

                {/* Left Resizer Handle */}
                {isLeftSidebarOpen && (
                    <div 
                        className="w-1 cursor-col-resize hover:bg-editorial-accent/50 transition-colors z-20 flex-none bg-editorial-border/30 -ml-1"
                        onMouseDown={(e) => {
                            isResizingLeft.current = true;
                            document.body.style.cursor = 'col-resize';
                            e.preventDefault();
                        }}
                    ></div>
                )}

                {/* Center Content Area */}
                <div className="flex-1 bg-[#F5F3F0] overflow-hidden flex flex-col relative justify-center">
                    
                    {state === AppState.RESEARCHING && (
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                            {/* Live Preview Container */}
                            <div ref={previewRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
                                {accumulatedReport ? (
                                    <div className="max-w-5xl mx-auto p-12 md:p-16 bg-white min-h-screen my-8 border-none shadow-none">
                                        <div className="prose prose-lg max-w-none font-serif text-editorial-text">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    h1: ({node, ...props}) => <h1 className="font-serif text-3xl font-bold border-b border-editorial-border pb-4 mb-6 mt-8" {...props} />,
                                                    h2: ({node, ...props}) => <h2 className="font-serif text-2xl font-bold text-editorial-text mt-8 mb-4 pl-0" {...props} />,
                                                    p: ({node, ...props}) => <p className="font-sans text-editorial-text leading-relaxed mb-4 text-justify indent-8" {...props} />,
                                                    table: ({node, ...props}) => <table className="w-full text-left border-collapse my-8 border-t-2 border-b-2 border-editorial-text table-fixed" {...props} />,
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
                         <div className="h-full w-full bg-[#F5F3F0] relative overflow-hidden">
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
            </>
          )}
       </div>
    </div>
  );
};

export default App;