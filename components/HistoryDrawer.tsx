import React from 'react';
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[#0a0a0c] border-l border-white/10 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0a0a0c]">
          <h2 className="text-lg font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <span className="text-blue-500">✦</span> 研究档案
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
               <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="font-mono text-xs uppercase tracking-widest">暂无历史记录</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className="group p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/30 transition-all cursor-pointer relative"
                onClick={() => { onSelect(item); onClose(); }}
              >
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-serif font-bold text-gray-200 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">{item.title}</h3>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                     className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                     title="删除"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 uppercase">
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                  <span>{item.sources?.length || 0} 引用源</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 text-center">
            <p className="text-[10px] text-gray-600 font-mono">数据存储在本地浏览器中</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryDrawer;