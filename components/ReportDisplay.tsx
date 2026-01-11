import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { Source } from '../types';

interface ReportDisplayProps {
  title: string;
  report: string;
  sources: Source[];
  onReset: () => void;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

const ReportDisplay: React.FC<ReportDisplayProps> = ({ title, report, sources, onReset }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [processedReport, setProcessedReport] = useState(report);
  const [toc, setToc] = useState<TOCItem[]>([]);
  
  // TOC Sidebar State
  const [tocWidth, setTocWidth] = useState(280);
  const [isTocVisible, setIsTocVisible] = useState(true);
  const tocRef = useRef<HTMLDivElement>(null);
  const isResizingToc = useRef(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'Source Sans 3',
        primaryColor: '#F5F3F0',
        primaryTextColor: '#1A1A1A',
        primaryBorderColor: '#B8860B',
        lineColor: '#1A1A1A',
        secondaryColor: '#FAFAF8',
        tertiaryColor: '#fff',
      },
      securityLevel: 'loose',
    });
  }, []);

  // Parse Headers for TOC and add IDs to Report
  useEffect(() => {
    const lines = report.split('\n');
    const newToc: TOCItem[] = [];
    const newLines = lines.map((line) => {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        if (level > 1) { 
           newToc.push({ id, text, level });
           return `<h${level} id="${id}">${text}</h${level}>`;
        }
      }
      return line;
    });

    setToc(newToc);
    // Strip citations for display
    const contentWithoutCitations = newLines.join('\n').replace(/\[([0-9]+)\]/g, ''); 
    setProcessedReport(contentWithoutCitations);
    
    setTimeout(() => {
      mermaid.run({ querySelector: '.mermaid' });
    }, 100);
  }, [report]);

  // TOC Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingToc.current) return;
      // Resizing from the left edge of right sidebar
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < 500) {
        setTocWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingToc.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleTocMouseDown = (e: React.MouseEvent) => {
    isResizingToc.current = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  };

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.md`;
    link.click();
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    const element = document.getElementById('report-content');
    if (!element) return;

    const originalStyle = element.getAttribute('style');
    element.style.padding = '0';
    element.style.margin = '0';
    element.style.maxWidth = '100%';

    const article = element.querySelector('article');
    const content = article ? article.innerHTML : element.innerHTML;
    
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${title}</title><style>body{font-family:'Times New Roman',serif; font-size:12pt;} h1,h2,h3{font-family:'Arial',sans-serif; color:#333;} table{border-collapse:collapse;width:100%;border:1px solid #000;} td,th{border:1px solid #000;padding:8px;}</style></head><body>`;
    const footer = "</body></html>";
    const blob = new Blob([header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.doc`;
    link.click();

    element.setAttribute('style', originalStyle || '');
    setIsExporting(false);
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
    <div className="w-full h-full flex relative">
      
      {/* Main Content Area */}
      <div className="flex-1 bg-[#F5F3F0] h-full relative overflow-y-auto custom-scrollbar flex flex-col items-center">
        
        {/* Floating Toolbar */}
        <div className="sticky top-4 z-40 w-full max-w-[800px] flex justify-end pointer-events-none px-4 md:px-0">
           <div className="pointer-events-auto flex gap-2 bg-white/90 backdrop-blur border border-editorial-border shadow-sm p-1.5 rounded-full">
              <button disabled={isExporting} onClick={handleExportMarkdown} className="px-3 py-1.5 hover:bg-gray-100 text-xs font-sans font-medium text-editorial-text rounded-full transition-colors flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Markdown
              </button>
              <div className="w-px bg-editorial-border my-1"></div>
              <button disabled={isExporting} onClick={handleExportWord} className="px-3 py-1.5 hover:bg-gray-100 text-xs font-sans font-medium text-editorial-text rounded-full transition-colors flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Word
              </button>
              <div className="w-px bg-editorial-border my-1"></div>
              <button onClick={() => setIsTocVisible(!isTocVisible)} className="px-3 py-1.5 hover:bg-gray-100 text-xs font-sans font-medium text-editorial-text rounded-full transition-colors">
                 {isTocVisible ? '隐藏目录' : '显示目录'}
              </button>
           </div>
        </div>

        {/* Paper Container (A4 Width approx 800px) */}
        <div id="report-content" className="w-full max-w-[800px] bg-white shadow-editorial-lg min-h-screen my-8 px-12 py-16 md:px-16 md:py-20 animate-fade-in relative z-10">
          
          {/* Header */}
          <div className="border-b-2 border-editorial-text pb-8 mb-12 text-center">
              <div className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-editorial-accent">
                Deep Research Report
              </div>
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-editorial-text mb-6 leading-tight">{title}</h1>
              <div className="flex justify-center items-center gap-6 text-sm font-serif italic text-editorial-subtext">
                 <span>{new Date().toLocaleDateString('zh-CN', {year:'numeric', month:'long', day:'numeric'})}</span>
                 <span className="w-1 h-1 rounded-full bg-editorial-border"></span>
                 <span>深度分析</span>
                 <span className="w-1 h-1 rounded-full bg-editorial-border"></span>
                 <span>{sources.length} 处引用</span>
              </div>
          </div>

          {/* Content */}
          <article className="document-theme">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h2: ({node, ...props}) => <h2 className="scroll-mt-24" {...props} />, 
                h3: ({node, ...props}) => <h3 className="scroll-mt-24" {...props} />,
                code({node, className, children, ...props}) {
                  const match = /language-mermaid/.test(className || '')
                  if (match) {
                    return (
                      <div className="mermaid bg-[#F9F9F9] p-8 border border-editorial-border flex justify-center my-12 overflow-x-auto">
                        {String(children).replace(/\n$/, '')}
                      </div>
                    )
                  }
                  return <code className="bg-editorial-highlight text-editorial-accent px-1.5 py-0.5 rounded-sm text-sm font-mono" {...props}>{children}</code>
                },
                img: ({node, ...props}) => <img className="shadow-editorial-md border border-editorial-border my-8 w-full block" {...props} alt="" />,
              }}
            >
              {processedReport}
            </ReactMarkdown>
          </article>

          {/* Refactored References (Embedded Links) */}
          {sources.length > 0 && (
            <div className="mt-24 pt-12 border-t border-editorial-border break-before-page">
              <h3 className="text-2xl font-serif font-bold mb-8 text-editorial-text flex items-center gap-3">
                  <span className="text-editorial-accent text-xl">§</span> 参考文献与数据源
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {sources.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-mono text-editorial-subtext text-xs pt-1.5 w-6 text-right">[{i+1}]</span>
                    
                    <a href={s.uri} target="_blank" rel="noreferrer" className="group flex-1 flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-editorial-highlight hover:border-editorial-border transition-all">
                        {/* Favicon */}
                        <div className="w-8 h-8 rounded bg-white border border-editorial-border flex items-center justify-center flex-none">
                            <img src={getFaviconUrl(s.uri)} alt="" className="w-4 h-4 opacity-80" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                        
                        <div className="flex-1">
                             <div className="font-serif font-medium text-editorial-text group-hover:text-editorial-accent transition-colors leading-tight">
                                {s.title}
                             </div>
                             <div className="text-[10px] font-mono text-editorial-subtext mt-1 truncate max-w-[300px] opacity-60">
                                {s.uri}
                             </div>
                        </div>

                        <svg className="w-4 h-4 text-editorial-subtext opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resizable Right TOC Sidebar */}
      {isTocVisible && (
        <>
            <div 
                className="w-1 cursor-col-resize hover:bg-editorial-accent/50 transition-colors z-20 flex-none"
                onMouseDown={handleTocMouseDown}
            ></div>
            <div 
                ref={tocRef}
                style={{ width: tocWidth }} 
                className="hidden lg:block flex-none sticky top-0 h-screen overflow-y-auto border-l border-editorial-border bg-white p-8 z-10"
            >
                <div className="mb-6">
                <h3 className="font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest mb-4">目录</h3>
                </div>
                <nav className="space-y-3">
                {toc.map((item) => (
                    <button
                    key={item.id}
                    onClick={() => handleScrollTo(item.id)}
                    className={`block text-left text-sm transition-colors hover:text-editorial-accent leading-snug w-full ${
                        item.level === 2 ? 'font-serif font-medium text-editorial-text' : 
                        item.level === 3 ? 'font-sans text-editorial-subtext pl-4 text-xs' : 'pl-6 text-xs text-gray-400'
                    }`}
                    >
                    {item.text}
                    </button>
                ))}
                </nav>
            </div>
        </>
      )}
    </div>
  );
};

export default ReportDisplay;