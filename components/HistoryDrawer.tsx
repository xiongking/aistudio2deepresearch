import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { ResearchResult } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ResearchResult[];
  onSelect: (result: ResearchResult) => void;
  onDelete: (id: string) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, history, onSelect, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-editorial-text/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-sm bg-white h-full shadow-editorial-lg flex flex-col animate-slide-up border-l border-editorial-border">
        <div className="p-6 border-b border-editorial-border flex justify-between items-center bg-editorial-bg">
          <h2 className="font-serif text-xl font-bold text-editorial-text">研究档案</h2>
          <button onClick={onClose} className="text-editorial-subtext hover:text-editorial-text transition-colors">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-editorial-bg">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-editorial-subtext opacity-60">
               <div className="w-px h-12 bg-editorial-border mb-4"></div>
               <p className="font-serif italic text-sm">暂无历史记录</p>
            </div>
          ) : (
            <div className="divide-y divide-editorial-border">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="group p-6 hover:bg-white transition-all cursor-pointer relative"
                  onClick={() => { onSelect(item); onClose(); }}
                >
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="font-serif font-bold text-lg text-editorial-text leading-tight group-hover:text-editorial-accent transition-colors line-clamp-2">{item.title}</h3>
                     <button 
                       onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                       className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all absolute top-4 right-4"
                       title="删除"
                     >
                       <Trash2 size={16} strokeWidth={1.5} />
                     </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-editorial-subtext uppercase tracking-wider">
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    <span className="w-1 h-1 rounded-full bg-editorial-border"></span>
                    <span>{item.sources?.length || 0} 引用</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-white border-t border-editorial-border text-center">
            <p className="text-xs text-editorial-subtext font-serif italic">数据仅存储在本地浏览器中</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryDrawer;