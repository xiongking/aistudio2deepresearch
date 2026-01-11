import React, { useState } from 'react';

interface OutlineEditorProps {
  initialTitle: string;
  initialChapters: string[];
  onConfirm: (title: string, chapters: string[]) => void;
  onCancel: () => void;
}

const OutlineEditor: React.FC<OutlineEditorProps> = ({ initialTitle, initialChapters, onConfirm, onCancel }) => {
  const [title, setTitle] = useState(initialTitle);
  const [chapters, setChapters] = useState(initialChapters);

  const handleChapterChange = (index: number, value: string) => {
    const newChapters = [...chapters];
    newChapters[index] = value;
    setChapters(newChapters);
  };

  const addChapter = () => {
    setChapters([...chapters, `新增章节 ${chapters.length + 1}`]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length <= 1) return;
    const newChapters = chapters.filter((_, i) => i !== index);
    setChapters(newChapters);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-editorial-border shadow-editorial-lg p-8 animate-fade-in relative z-20 rounded-sm">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-editorial-text font-bold mb-2">研究大纲确认</h2>
        <p className="text-editorial-subtext text-sm font-sans">请审阅并编辑以下生成的目录结构，确认后将开始撰写。</p>
      </div>

      <div className="space-y-6">
        <div>
           <label className="block text-xs font-mono font-bold text-editorial-subtext uppercase tracking-widest mb-2">报告标题</label>
           <input 
             type="text" 
             value={title} 
             onChange={(e) => setTitle(e.target.value)}
             className="w-full text-xl font-serif font-bold text-editorial-text border-b-2 border-editorial-border focus:border-editorial-accent outline-none py-2 bg-transparent transition-colors"
           />
        </div>

        <div>
           <label className="block text-xs font-mono font-bold text-editorial-subtext uppercase tracking-widest mb-4">章节目录 ({chapters.length})</label>
           <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
             {chapters.map((chapter, idx) => (
               <div key={idx} className="flex gap-3 items-center group">
                 <span className="font-mono text-xs text-editorial-subtext w-6 pt-1 text-right">{idx + 1}.</span>
                 <input
                   type="text"
                   value={chapter}
                   onChange={(e) => handleChapterChange(idx, e.target.value)}
                   className="flex-1 font-sans text-sm border border-editorial-border rounded px-3 py-2 focus:border-editorial-accent outline-none text-editorial-text"
                 />
                 <button 
                   onClick={() => removeChapter(idx)}
                   className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                   title="删除章节"
                 >
                   ×
                 </button>
               </div>
             ))}
           </div>
           <button 
             onClick={addChapter}
             className="mt-4 text-xs font-mono text-editorial-accent hover:text-editorial-accentLight font-bold uppercase tracking-wider flex items-center gap-2"
           >
             + 添加章节
           </button>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-editorial-border">
        <button 
          onClick={onCancel}
          className="px-6 py-2 text-sm text-editorial-subtext hover:text-editorial-text transition-colors"
        >
          取消
        </button>
        <button 
          onClick={() => onConfirm(title, chapters)}
          className="px-8 py-2 bg-editorial-text text-white text-sm font-medium hover:bg-black transition-all shadow-md"
        >
          确认并撰写
        </button>
      </div>
    </div>
  );
};

export default OutlineEditor;