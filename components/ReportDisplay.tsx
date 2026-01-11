import React, { useEffect, useState } from 'react';
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
        
        // Skip main title (H1) usually used for Report Title
        if (level > 1) { 
           newToc.push({ id, text, level });
           return `<h${level} id="${id}">${text}</h${level}>`;
        }
      }
      return line;
    });

    setToc(newToc);
    // Remove citations for display if any remain
    const contentWithoutCitations = newLines.join('\n').replace(/\[([0-9]+)\]/g, ''); 
    setProcessedReport(contentWithoutCitations);
    
    setTimeout(() => {
      mermaid.run({ querySelector: '.mermaid' });
    }, 100);
  }, [report]);

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

    // Clone to remove TOC/interactive elements if any, though we are targeting #report-content
    // Temporarily styling for export
    const originalStyle = element.getAttribute('style');
    element.style.padding = '0';
    element.style.margin = '0';
    element.style.maxWidth = '100%';

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${title}</title><style>body{font-family:'Times New Roman',serif; font-size:12pt;} h1,h2,h3{font-family:'Arial',sans-serif; color:#333;} table{border-collapse:collapse;width:100%;border:1px solid #000;} td,th{border:1px solid #000;padding:8px;}</style></head><body>`;
    
    // We need to render the markdown to HTML string for the doc
    // Using the current innerHTML of the rendered article
    const article = element.querySelector('article');
    const content = article ? article.innerHTML : element.innerHTML;
    
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

  return (
    <div className="w-full h-full flex flex-col lg:flex-row relative">
      
      {/* Sidebar TOC - Desktop */}
      <div className="hidden lg:block w-64 flex-none sticky top-0 h-screen overflow-y-auto border-r border-editorial-border bg-editorial-bg p-8">
        <div className="mb-6">
          <button onClick={onReset} className="w-full py-2 bg-editorial-accent hover:bg-editorial-accentLight text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm mb-6">
            新研究
          </button>
          <h3 className="font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest mb-4">目录</h3>
        </div>
        <nav className="space-y-3">
          {toc.map((item) => (
            <button
              key={item.id}
              onClick={() => handleScrollTo(item.id)}
              className={`block text-left text-sm transition-colors hover:text-editorial-accent leading-snug ${
                item.level === 2 ? 'font-serif font-medium text-editorial-text' : 
                item.level === 3 ? 'font-sans text-editorial-subtext pl-4 text-xs' : 'pl-6 text-xs text-gray-400'
              }`}
            >
              {item.text}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white min-h-screen relative overflow-y-auto custom-scrollbar">
        
        {/* Floating Toolbar (Mobile/Tablet friendly, non-obtrusive) */}
        <div className="sticky top-0 z-40 w-full flex justify-end p-4 pointer-events-none bg-gradient-to-b from-white via-white/80 to-transparent">
           <div className="pointer-events-auto flex gap-2 bg-white border border-editorial-border shadow-sm p-1 rounded-md">
              <button disabled={isExporting} onClick={handleExportMarkdown} className="px-3 py-1.5 hover:bg-gray-100 text-xs font-sans font-medium text-editorial-text rounded transition-colors flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Markdown
              </button>
              <div className="w-px bg-editorial-border my-1"></div>
              <button disabled={isExporting} onClick={handleExportWord} className="px-3 py-1.5 hover:bg-gray-100 text-xs font-sans font-medium text-editorial-text rounded transition-colors flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Word
              </button>
              {/* Mobile Only Reset */}
              <div className="w-px bg-editorial-border my-1 lg:hidden"></div>
              <button onClick={onReset} className="px-3 py-1.5 text-editorial-accent hover:text-editorial-accentLight text-xs font-bold lg:hidden">
                重置
              </button>
           </div>
        </div>

        {/* Paper Container */}
        <div id="report-content" className="max-w-4xl mx-auto px-8 md:px-16 pb-24 pt-4">
          
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
                h2: ({node, ...props}) => <h2 className="scroll-mt-24" {...props} />, // Offset for header
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

          {/* References */}
          {sources.length > 0 && (
            <div className="mt-24 pt-12 border-t border-editorial-border">
              <h3 className="text-2xl font-serif font-bold mb-8 text-editorial-text flex items-center gap-3">
                  <span className="text-editorial-accent text-xl">§</span> 参考文献与数据源
              </h3>
              <div className="grid grid-cols-1 gap-0">
                {sources.map((s, i) => (
                  <div key={i} className="flex gap-4 py-3 border-b border-editorial-border/50 hover:bg-editorial-highlight/50 transition-colors px-4 -mx-4">
                    <span className="font-mono text-editorial-subtext text-xs pt-1 w-8">[{i+1}]</span>
                    <div className="flex-1">
                      <div className="text-editorial-text font-serif text-base mb-1 leading-snug">{s.title}</div>
                      <a href={s.uri} target="_blank" rel="noreferrer" className="text-xs font-mono text-editorial-accent hover:underline break-all block">
                          {s.uri}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDisplay;