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
  children: TOCItem[];
}

const ReportDisplay: React.FC<ReportDisplayProps> = ({ title, report, sources, onReset }) => {
  const [processedReport, setProcessedReport] = useState(report);
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // TOC Sidebar State
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [tocWidth, setTocWidth] = useState(320);
  const isResizingToc = useRef(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Source Sans 3',
    });
  }, []);

  // Mermaid Rerender Trigger
  useEffect(() => {
    const timer = setTimeout(() => {
        mermaid.run({
            querySelector: '.mermaid'
        }).catch(err => console.debug('Mermaid init error (harmless if no graphs):', err));
    }, 100);
    return () => clearTimeout(timer);
  }, [processedReport]);

  // TOC Resize Handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingToc.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < 600) {
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


  // Parse Headers for TOC (H1 -> H2 -> H3)
  useEffect(() => {
    // 1. Process Citations: [1] -> <a href="#ref-1" class="citation-badge">1</a>
    // We remove the brackets in the visual display, using a circle badge instead.
    const reportWithCitations = report.replace(
        /\[(\d+)\]/g, 
        '<a href="#ref-$1" class="citation-badge" title="查看来源">$1</a>'
    );

    const lines = reportWithCitations.split('\n');
    const rootToc: TOCItem[] = [];
    let currentH1: TOCItem | null = null;
    let currentH2: TOCItem | null = null;

    const newLines = lines.map((line) => {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const item: TOCItem = { id, text, level, children: [] };

        if (level === 1) {
            rootToc.push(item);
            currentH1 = item;
            currentH2 = null;
            // Expand Level 1 by default to show Level 2
            setExpandedSections(prev => new Set(prev).add(id));
        } else if (level === 2) {
            if (currentH1) {
                currentH1.children.push(item);
            } else {
                rootToc.push(item); // Fallback if no H1
            }
            currentH2 = item;
            // Level 2 not expanded by default (hiding Level 3)
        } else if (level === 3) {
            if (currentH2) {
                currentH2.children.push(item);
            } else if (currentH1) {
                currentH1.children.push(item);
            }
        }
        
        return `<h${level} id="${id}">${text}</h${level}>`;
      }
      return line;
    });

    // Add References to TOC if sources exist
    if (sources.length > 0) {
        rootToc.push({
            id: 'references-section',
            text: '参考文献与数据源',
            level: 1,
            children: []
        });
    }

    setToc(rootToc);
    setProcessedReport(newLines.join('\n'));
  }, [report, sources]);

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
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
    <div className="w-full h-full flex relative bg-editorial-highlight">
      
      {/* Main Content Area */}
      <div className="flex-1 h-full relative overflow-y-auto custom-scrollbar flex flex-col items-center">
        
        {/* Paper Container - Removed Shadow and White Bg */}
        <div id="report-container" className="w-full max-w-5xl my-10 px-12 py-16 md:px-20 md:py-24 animate-fade-in relative z-10 box-border min-h-screen">
          
          {/* Header - Date Only */}
          <div className="pb-4 mb-4 text-left border-b border-editorial-border">
              <div className="text-sm font-serif italic text-editorial-subtext">
                 {new Date().toLocaleDateString('zh-CN', {year:'numeric', month:'long', day:'numeric'})}
              </div>
          </div>

          {/* Content */}
          <article className="document-theme">
            <style>{`
              /* Only indent direct body paragraphs */
              .document-theme p {
                text-indent: 2em;
                text-align: justify;
                margin-bottom: 1.5em;
              }
              
              /* Strict Indent Reset for everything else */
              .document-theme h1, 
              .document-theme h2, 
              .document-theme h3, 
              .document-theme h4, 
              .document-theme h5, 
              .document-theme h6, 
              .document-theme li, 
              .document-theme ul, 
              .document-theme ol, 
              .document-theme table, 
              .document-theme thead, 
              .document-theme tbody, 
              .document-theme tr, 
              .document-theme th, 
              .document-theme td, 
              .document-theme blockquote,
              .document-theme .mermaid,
              .document-theme sup,
              .document-theme img,
              .citation-badge {
                text-indent: 0 !important;
                margin-left: 0 !important;
              }

              /* Lists indentation handling (padding, not text-indent) */
              .document-theme ul, .document-theme ol {
                padding-left: 2em;
              }
              .document-theme li {
                padding-left: 0.2em;
                margin-bottom: 0.5em;
              }
              
              /* Table typography fixes */
              .document-theme table th, .document-theme table td {
                 text-align: left;
                 text-indent: 0;
              }

              /* Strict Mermaid Reset */
              .document-theme .mermaid {
                display: flex;
                justify-content: center;
                background-color: #FAFAF8;
                padding: 1.5rem;
                border: 1px solid #E8E4DF;
                margin: 2rem 0;
                overflow-x: auto;
                text-indent: 0 !important;
              }
              
              /* Prominent Citation Badge Style */
              .citation-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                height: 1.25em;
                min-width: 1.25em;
                padding: 0 0.25em;
                background-color: #B8860B; /* Editorial Accent */
                color: white !important; /* Force white text */
                border-radius: 9999px; /* Rounded pill/circle */
                font-family: 'IBM Plex Mono', monospace;
                font-size: 0.65em;
                font-weight: 600;
                text-decoration: none !important;
                border-bottom: none !important;
                vertical-align: super;
                margin: 0 2px;
                line-height: 1;
                transform: translateY(-2px);
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(184, 134, 11, 0.3);
              }
              .citation-badge:hover {
                background-color: #1A1A1A; /* Dark on hover */
                transform: translateY(-4px) scale(1.1);
                box-shadow: 0 3px 6px rgba(0,0,0,0.2);
              }
            `}</style>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-4xl font-serif font-bold text-editorial-text mb-8 text-left !indent-0" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-serif font-bold text-editorial-text mt-8 mb-4 text-left !indent-0 scroll-mt-24" {...props} />, 
                h3: ({node, ...props}) => <h3 className="text-xl font-serif font-bold text-editorial-text mt-6 mb-3 text-left !indent-0 scroll-mt-24" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-editorial-text" {...props} />,
                table: ({node, ...props}) => <table className="w-full text-left border-collapse my-8 border-t-2 border-b-2 border-editorial-text table-fixed !indent-0" {...props} />,
                thead: ({node, ...props}) => <thead className="bg-[#EFEBE6] border-b-2 border-editorial-accent !indent-0" {...props} />,
                tbody: ({node, ...props}) => <tbody className="!indent-0" {...props} />,
                tr: ({node, ...props}) => <tr className="even:bg-[#FAFAF8] hover:bg-editorial-highlight/80 border-b border-editorial-border/30 last:border-0 transition-colors !indent-0" {...props} />,
                th: ({node, ...props}) => <th className="p-3 font-serif font-bold text-sm uppercase tracking-wider text-editorial-text !indent-0" {...props} />,
                td: ({node, ...props}) => <td className="p-3 font-sans text-sm text-editorial-text align-top !indent-0" {...props} />,
                code({node, className, children, ...props}) {
                  const match = /language-mermaid/.test(className || '')
                  if (match) {
                    return (
                      <div className="mermaid not-prose">
                        {String(children).replace(/\n$/, '')}
                      </div>
                    )
                  }
                  return <code className="bg-editorial-highlight text-editorial-accent px-1.5 py-0.5 rounded-sm text-sm font-mono !indent-0" {...props}>{children}</code>
                },
                img: ({node, ...props}) => <img className="shadow-editorial-md border border-editorial-border my-8 w-full block !indent-0" {...props} alt="" />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 !indent-0" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 !indent-0" {...props} />,
                li: ({node, ...props}) => <li className="mb-1 !indent-0 pl-1" {...props} />
              }}
            >
              {processedReport}
            </ReactMarkdown>
          </article>

          {/* Refactored References (Level 1 Header Style) */}
          {sources.length > 0 && (
            <div id="references-section" className="mt-16 pt-8 border-t-2 border-editorial-text break-before-page">
              <h1 className="text-2xl font-serif font-bold mb-8 text-editorial-text flex items-center gap-2 !indent-0">
                 参考文献与数据源
              </h1>
              <div className="grid grid-cols-1 gap-1.5 !indent-0">
                {sources.map((s, i) => (
                  <div key={i} id={`ref-${i+1}`} className="flex items-start gap-2 text-sm !indent-0 scroll-mt-32 hover:bg-editorial-highlight/50 p-1 rounded transition-colors">
                    {/* Matching Reference Badge */}
                    <span className="flex-none flex items-center justify-center w-5 h-5 bg-editorial-accent text-white rounded-full text-[10px] font-mono font-bold mt-0.5">
                      {i+1}
                    </span>
                    
                    <a href={s.uri} target="_blank" rel="noreferrer" className="group flex items-center gap-2 px-1 rounded transition-colors max-w-full overflow-hidden">
                        <img 
                          src={getFaviconUrl(s.uri)} 
                          alt="•" 
                          className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 flex-none" 
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOViOUI5IiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+' }} 
                        />
                        <span className="font-serif text-editorial-text border-b border-transparent group-hover:border-editorial-accent group-hover:text-editorial-accent transition-all truncate leading-snug">
                            {s.title}
                        </span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Marker TOC Toggle - Right Edge */}
      <button 
        onClick={() => setIsTocOpen(!isTocOpen)}
        className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-50 bg-white border border-editorial-border shadow-md py-3 pl-2 pr-1 rounded-l-md transition-all duration-300 group hover:bg-editorial-highlight`}
        style={{ right: isTocOpen ? tocWidth : 0 }}
        title={isTocOpen ? "收起目录" : "展开目录"}
      >
        <div className="writing-vertical-rl text-xs font-mono font-bold text-editorial-subtext tracking-widest uppercase flex items-center gap-2">
           <span className="w-1 h-1 rounded-full bg-editorial-accent group-hover:scale-125 transition-transform"></span>
        </div>
      </button>

      {/* Right TOC Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full bg-white/95 backdrop-blur shadow-2xl z-40 transition-[width] duration-300 border-l border-editorial-border flex flex-col`}
        style={{ width: isTocOpen ? tocWidth : 0 }}
      >
          {/* Resize Handle (Left edge of TOC) */}
          <div 
             className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-editorial-accent/50 transition-colors z-50 -ml-0.5"
             onMouseDown={(e) => {
                 isResizingToc.current = true;
                 document.body.style.cursor = 'col-resize';
                 e.preventDefault();
             }}
          />

          <div className="p-6 border-b border-editorial-border flex justify-between items-center bg-editorial-bg/50">
            <h3 className="font-mono text-xs font-bold text-editorial-subtext uppercase tracking-widest whitespace-nowrap overflow-hidden">报告结构</h3>
            {/* Simple Close Button */}
            <button 
                onClick={() => setIsTocOpen(false)} 
                className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="关闭目录"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-1 custom-scrollbar w-full">
            {toc.map((item) => (
                <div key={item.id}>
                    <div className="flex items-center gap-1 group py-0.5">
                        {item.children.length > 0 && (
                        <button onClick={() => toggleSection(item.id)} className="p-1 text-gray-400 hover:text-editorial-accent flex-none">
                            <svg className={`w-3 h-3 transition-transform ${expandedSections.has(item.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        )}
                        <button
                        onClick={() => handleScrollTo(item.id)}
                        className={`block text-left text-sm transition-colors hover:text-editorial-accent leading-snug w-full truncate ${item.children.length === 0 ? 'pl-5' : ''} ${
                            item.level === 1 ? 'font-serif font-bold text-editorial-text pt-2' :
                            item.level === 2 ? 'font-serif font-medium text-editorial-text/90 pl-1' : 'font-sans text-gray-500 pl-2 text-xs'
                        }`}
                        title={item.text}
                        >
                        {item.text}
                        </button>
                    </div>
                    
                    {expandedSections.has(item.id) && item.children.length > 0 && (
                        <div className={`border-l border-editorial-border ml-2.5 ${item.level === 1 ? 'pl-2' : 'pl-4'}`}>
                            {item.children.map(child => (
                                <div key={child.id}>
                                    <div className="flex items-center gap-1 group">
                                         {child.children.length > 0 && (
                                            <button onClick={() => toggleSection(child.id)} className="p-1 text-gray-400 hover:text-editorial-accent flex-none">
                                                <svg className={`w-3 h-3 transition-transform ${expandedSections.has(child.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                         )}
                                        <button
                                            onClick={() => handleScrollTo(child.id)}
                                            className={`block text-left text-xs transition-colors hover:text-editorial-accent py-1 w-full truncate ${child.children.length === 0 ? 'pl-5' : ''} ${child.level === 2 ? 'font-serif font-medium text-editorial-text/90' : 'text-gray-400'}`}
                                            title={child.text}
                                        >
                                            {child.text}
                                        </button>
                                    </div>
                                    
                                    {/* Level 3 Children */}
                                    {expandedSections.has(child.id) && child.children.length > 0 && (
                                        <div className="pl-6 border-l border-editorial-border ml-2.5">
                                            {child.children.map(subChild => (
                                                <button
                                                    key={subChild.id}
                                                    onClick={() => handleScrollTo(subChild.id)}
                                                    className="block text-left text-[10px] text-gray-300 hover:text-editorial-accent py-0.5 w-full truncate"
                                                    title={subChild.text}
                                                >
                                                    {subChild.text}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default ReportDisplay;