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
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleChapterChange = (index: number, value: string) => {
    const newChapters = [...chapters];
    newChapters[index] = value;
    setChapters(newChapters);
  };

  const addChapterAt = (index: number) => {
    const newChapters = [...chapters];
    newChapters.splice(index + 1, 0, "新章节");
    setChapters(newChapters);
  };

  const removeChapter = (index: number) => {
    if (chapters.length <= 1) return;
    const newChapters = chapters.filter((_, i) => i !== index);
    setChapters(newChapters);
  };

  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newChapters = [...chapters];
    const draggedItem = newChapters[draggedItemIndex];
    newChapters.splice(draggedItemIndex, 1);
    newChapters.splice(index, 0, draggedItem);
    setChapters(newChapters);
    setDraggedItemIndex(index);
  };
  const handleDragEnd = () => setDraggedItemIndex(null);

  const handlePreview = () => {
    // Strip existing numbers if any, then re-number logic is visual only in preview? 
    // Or do we commit the numbers? Usually outline items are just strings.
    // We will clean them and let the user see the final order.
    const cleanChapters = chapters.map(c => c.replace(/^[\d\.]+\s*/, ''));
    setChapters(cleanChapters);
    setIsPreviewMode(true);
  };

  if (isPreviewMode) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white border border-editorial-border shadow-editorial-lg p-10 animate-fade-in relative z-20 rounded-sm">
         <div className="text-center mb-8 border-b border-editorial-border pb-6">
            <h2 className="font-serif text-3xl text-editorial-text font-bold mb-2">{title}</h2>
            <p className="text-editorial-subtext text-sm font-sans uppercase tracking-widest">最终大纲确认</p>
         </div>
         
         <div className="space-y-4 mb-8 pl-4 border-l-2 border-editorial-accent/20">
            {chapters.map((chapter, idx) => (
              <div key={idx} className="flex items-baseline gap-4">
                <span className="font-mono text-editorial-accent font-bold text-lg w-8 text-right">{idx + 1}.</span>
                <span className="font-serif text-xl text-editorial-text">{chapter}</span>
              </div>
            ))}
         </div>

         <div className="flex justify-between items-center pt-6 border-t border-editorial-border">
            <button 
              onClick={() => setIsPreviewMode(false)}
              className="text-editorial-subtext hover:text-editorial-text font-sans text-sm flex items-center gap-2 px-4 py-2"
            >
              ← 返回修改
            </button>
            <button 
              onClick={() => onConfirm(title, chapters.map((c, i) => `${i+1}. ${c}`))} 
              className="px-8 py-3 bg-editorial-text text-white text-sm font-medium hover:bg-black transition-all shadow-md flex items-center gap-2"
            >
              <span>开始深度研究</span>
              <span>→</span>
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-editorial-border shadow-editorial-lg p-8 animate-fade-in relative z-20 rounded-sm">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-editorial-text font-bold mb-2">研究大纲编辑</h2>
        <p className="text-editorial-subtext text-sm font-sans">拖拽调整顺序，点击加号插入章节。</p>
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
           <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
             {chapters.map((chapter, idx) => (
               <div key={idx} className="group relative">
                 <div 
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex gap-3 items-center p-2 rounded border border-transparent hover:border-editorial-border hover:bg-editorial-highlight/50 transition-all ${draggedItemIndex === idx ? 'opacity-50 bg-editorial-highlight' : ''}`}
                 >
                   <div className="cursor-grab active:cursor-grabbing text-editorial-border hover:text-editorial-subtext px-1">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                   </div>
                   
                   <input
                     type="text"
                     value={chapter}
                     onChange={(e) => handleChapterChange(idx, e.target.value)}
                     className="flex-1 font-sans text-sm bg-transparent outline-none text-editorial-text placeholder-gray-400"
                     placeholder="输入章节标题"
                   />
                   
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => addChapterAt(idx)} className="p-1 text-editorial-accent hover:bg-editorial-accent/10 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                      <button onClick={() => removeChapter(idx)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
           
           {chapters.length === 0 && (
              <button 
                onClick={() => setChapters(["新章节"])}
                className="w-full py-3 border-2 border-dashed border-editorial-border text-editorial-subtext hover:border-editorial-accent hover:text-editorial-accent rounded-lg text-sm font-medium transition-all"
              >
                + 添加第一章
              </button>
           )}
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-editorial-border">
        <button onClick={onCancel} className="px-6 py-2 text-sm text-editorial-subtext hover:text-editorial-text transition-colors">
          取消
        </button>
        <button onClick={handlePreview} className="px-8 py-2 bg-editorial-text text-white text-sm font-medium hover:bg-black transition-all shadow-md">
          预览并排序
        </button>
      </div>
    </div>
  );
};

export default OutlineEditor;