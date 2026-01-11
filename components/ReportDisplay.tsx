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

  useEffect(() => {
    const superscripted = report.replace(/(\[[0-9]+\])/g, '<sup>$1</sup>');
    setProcessedReport(superscripted);
    
    setTimeout(() => {
      mermaid.run({
        querySelector: '.mermaid'
      });
    }, 100);
  }, [report]);

  const prepareForExport = async (container: HTMLElement) => {
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
      
      if (svg.parentElement) {
        svg.parentElement.appendChild(replacementImg);
        svg.style.display = 'none';
        originalSvgs.push({ node: svg, replacement: replacementImg });
      }
    }
    
    return () => {
      originalSvgs.forEach(({ node, replacement }) => {
        (node as HTMLElement).style.display = 'block';
        replacement.remove();
      });
    };
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('report-content');
    if (!element) return;

    element.classList.add('export-mode');
    const cleanup = await prepareForExport(element);

    const opt = {
      margin: [15, 15, 15, 15], 
      filename: `${title.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // @ts-ignore
      await window.html2pdf().set(opt).from(element).save();
    } catch (e) {
      alert("导出失败");
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
    
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><style>body{font-family:'Times New Roman',serif;}</style></head><body>`;
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
    <div className="w-full max-w-5xl mx-auto pb-24 animate-fade-in bg-white shadow-editorial-lg min-h-screen my-8 border border-editorial-border/50">
      
      {/* Control Bar - Floating */}
      <div className="sticky top-6 z-50 flex justify-center pointer-events-none">
         <div className="pointer-events-auto flex gap-2 bg-editorial-text/90 backdrop-blur-md p-1.5 rounded-full shadow-editorial-lg text-white">
            <button disabled={isExporting} onClick={handleExportPDF} className="px-5 py-2 hover:bg-white/10 text-xs font-sans font-medium rounded-full transition-colors">
              PDF
            </button>
            <button disabled={isExporting} onClick={handleExportWord} className="px-5 py-2 hover:bg-white/10 text-xs font-sans font-medium rounded-full transition-colors">
              Word
            </button>
            <div className="w-px h-8 bg-white/20 mx-1"></div>
            <button onClick={onReset} className="px-6 py-2 bg-editorial-accent hover:bg-editorial-accentLight text-xs font-sans font-bold tracking-wider uppercase rounded-full transition-colors shadow-md">
              新研究
            </button>
         </div>
      </div>

      {/* Report Paper */}
      <div id="report-content" className="p-16 md:p-24 relative">
        
        {/* Header */}
        <div className="border-b-2 border-editorial-text pb-12 mb-16 text-center">
            <div className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-editorial-accent">
              Deep Research Report
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-editorial-text mb-8 leading-tight">{title}</h1>
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
          <div className="mt-32 pt-16 border-t border-editorial-border break-before-page">
            <h3 className="text-2xl font-serif font-bold mb-10 text-editorial-text flex items-center gap-3">
                <span className="text-editorial-accent text-xl">§</span> 参考文献与数据源
            </h3>
            <div className="grid grid-cols-1 gap-0">
              {sources.map((s, i) => (
                <div key={i} className="flex gap-4 py-4 border-b border-editorial-border/50 hover:bg-editorial-highlight/50 transition-colors px-4 -mx-4">
                  <span className="font-mono text-editorial-subtext text-xs pt-1 w-8">[{i+1}]</span>
                  <div className="flex-1">
                    <div className="text-editorial-text font-serif text-lg mb-1 leading-snug">{s.title}</div>
                    <a href={s.uri} target="_blank" rel="noreferrer" className="text-xs font-mono text-editorial-accent hover:underline break-all">
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