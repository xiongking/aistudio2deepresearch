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

const ReportDisplay: React.FC<ReportDisplayProps> = ({ title, report, sources, onReset }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [processedReport, setProcessedReport] = useState(report);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark', // We will stick to dark theme for web view, but export handles specific colors
      securityLevel: 'loose',
      fontFamily: 'Noto Serif SC',
    });
  }, []);

  // Pre-process report to convert [1] to <sup>[1]</sup>
  useEffect(() => {
    const superscripted = report.replace(/(\[[0-9]+\])/g, '<sup>$1</sup>');
    setProcessedReport(superscripted);
    
    setTimeout(() => {
      mermaid.run({
        querySelector: '.mermaid'
      });
    }, 100);
  }, [report]);

  /**
   * Prepares DOM for export
   */
  const prepareForExport = async (container: HTMLElement) => {
    // 1. Mermaid to PNG
    const svgs = container.querySelectorAll('.mermaid svg');
    const originalSvgs: { node: Element, replacement: Element }[] = [];

    for (let i = 0; i < svgs.length; i++) {
      const svg = svgs[i] as SVGSVGElement;
      const box = svg.getBoundingClientRect();
      const scale = 3; 
      const width = box.width * scale || 800;
      const height = box.height * scale || 600;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      });

      const pngData = canvas.toDataURL('image/png');
      const replacementImg = document.createElement('img');
      replacementImg.src = pngData;
      replacementImg.style.width = '100%';
      replacementImg.style.maxWidth = '600px';
      replacementImg.style.margin = '20px auto';
      replacementImg.style.display = 'block';
      replacementImg.style.border = '1px solid #eee';
      
      if (svg.parentElement) {
        svg.parentElement.appendChild(replacementImg);
        svg.style.display = 'none';
        originalSvgs.push({ node: svg, replacement: replacementImg });
      }
    }

    // 2. Inline Tables
    const tables = container.querySelectorAll('table');
    const tableCleanups: (() => void)[] = [];
    
    tables.forEach(table => {
        const originalBorder = table.style.border;
        const originalCollapse = table.style.borderCollapse;
        table.style.border = '1px solid #000';
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
             const el = cell as HTMLElement;
             const origBorder = el.style.border;
             const origPad = el.style.padding;
             const origColor = el.style.color;
             el.style.border = '1px solid #000';
             el.style.padding = '8px';
             el.style.color = '#000';
             tableCleanups.push(() => {
                 el.style.border = origBorder;
                 el.style.padding = origPad;
                 el.style.color = origColor;
             });
        });
        tableCleanups.push(() => {
            table.style.border = originalBorder;
            table.style.borderCollapse = originalCollapse;
        });
    });

    return () => {
      originalSvgs.forEach(({ node, replacement }) => {
        (node as HTMLElement).style.display = 'block';
        replacement.remove();
      });
      tableCleanups.forEach(fn => fn());
    };
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('report-content');
    if (!element) return;

    element.classList.add('export-mode');
    const cleanup = await prepareForExport(element);

    const opt = {
      margin: [10, 10, 10, 10], 
      filename: `${title.replace(/\s+/g, '_')}_报告.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // @ts-ignore
      await window.html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("PDF Export failed", e);
      alert("PDF 导出失败，请重试");
    }

    cleanup();
    element.classList.remove('export-mode');
    setIsExporting(false);
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    const element = document.getElementById('report-content');
    if (!element) return;

    element.classList.add('export-mode');
    const cleanup = await prepareForExport(element);
    
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Times New Roman', serif; color: #000; line-height: 1.5; }
          h1, h2, h3, h4 { color: #000; margin-top: 15px; margin-bottom: 10px; font-weight: bold; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #000; }
          td, th { border: 1px solid #000; padding: 10px; text-align: left; font-size: 11pt; }
          th { background-color: #f0f0f0; font-weight: bold; }
          a { color: #0563c1; text-decoration: underline; }
          sup { vertical-align: super; font-size: smaller; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>`;
    
    const content = element.innerHTML;
    const footer = "</body></html>";
    const blob = new Blob([header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.doc`;
    link.click();

    cleanup();
    element.classList.remove('export-mode');
    setIsExporting(false);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 w-full max-w-7xl mx-auto pb-20">
      
      {/* Control Bar */}
      <div className="sticky top-6 z-50 flex flex-wrap gap-4 justify-between items-center bg-[#111]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-8 shadow-2xl ring-1 ring-white/5">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
               <span className="text-blue-400 text-lg">📄</span>
            </div>
            <div>
              <h1 className="text-lg font-bold font-serif text-white truncate max-w-xs md:max-w-md">{title}</h1>
              <p className="text-xs text-gray-400 font-mono">{sources.length} 引用源 • {new Date().toLocaleDateString()}</p>
            </div>
         </div>

         <div className="flex gap-2">
            <button disabled={isExporting} onClick={handleExportPDF} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold uppercase rounded-lg transition-colors border border-white/10 flex items-center gap-2">
              {isExporting ? '处理中...' : '下载 PDF'}
            </button>
            <button disabled={isExporting} onClick={handleExportWord} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold uppercase rounded-lg transition-colors border border-white/10">
              下载 DOCX
            </button>
            <div className="w-px h-8 bg-white/10 mx-2"></div>
            <button onClick={onReset} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 text-xs font-mono font-bold uppercase rounded-lg transition-all">
              新研究
            </button>
         </div>
      </div>

      {/* Report Paper Container */}
      <div id="report-content" className="bg-[#0a0a0c] text-gray-200 p-8 md:p-16 lg:p-24 shadow-2xl min-h-screen rounded-xl border border-white/5 relative">
        
        {/* Decorative Watermark */}
        <div className="absolute top-8 right-8 text-white/5 font-serif text-6xl font-bold select-none pointer-events-none opacity-20 rotate-12">DEEP RESEARCH</div>

        {/* Title Page Effect */}
        <div className="border-b border-white/10 pb-12 mb-16 text-center md:text-left">
            <div className="inline-block px-3 py-1 mb-6 border border-blue-500/30 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono tracking-widest uppercase">
              Generated by DeepSeeker Agent
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-white mb-8 leading-tight tracking-tight">{title}</h1>
            <div className="flex flex-wrap gap-6 text-sm font-mono text-gray-500 uppercase tracking-widest items-center md:justify-start justify-center">
               <span>{new Date().toLocaleDateString()}</span>
               <span className="w-1 h-1 rounded-full bg-gray-600"></span>
               <span>深度研究报告</span>
               <span className="w-1 h-1 rounded-full bg-gray-600"></span>
               <span>内部绝密资料</span>
            </div>
        </div>

        {/* Main Content with Document Theme */}
        <article className="document-theme">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              code({node, className, children, ...props}) {
                const match = /language-mermaid/.test(className || '')
                if (match) {
                  return (
                    <div className="mermaid bg-[#0f0f12] p-6 rounded-xl border border-white/5 flex justify-center my-10 shadow-lg overflow-x-auto">
                      {String(children).replace(/\n$/, '')}
                    </div>
                  )
                }
                return <code {...props}>{children}</code>
              },
              // Handled by CSS class .document-theme, but we can enforce overrides if needed
              img: ({node, ...props}) => <img className="rounded-xl shadow-lg border border-white/10 my-8 w-full" {...props} alt="" />,
            }}
          >
            {processedReport}
          </ReactMarkdown>
        </article>

        {/* References */}
        {sources.length > 0 && (
          <div className="mt-32 pt-16 border-t border-dashed border-white/20 break-before-page">
            <h3 className="text-2xl font-bold font-serif mb-10 text-white flex items-center gap-4">
                <span className="text-blue-500 text-3xl">✦</span> 参考文献与数据源
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map((s, i) => (
                <div key={i} className="group flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.05] transition-all">
                  <span className="font-mono text-blue-400 font-bold mt-1 text-sm">[{i+1}]</span>
                  <div className="overflow-hidden flex-1">
                    <div className="text-gray-300 font-serif text-sm font-medium mb-1.5 leading-snug group-hover:text-white transition-colors">{s.title}</div>
                    <a href={s.uri} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 font-mono hover:text-blue-400 transition-colors truncate block">
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
  );
};

export default ReportDisplay;