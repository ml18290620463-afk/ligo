import React, { lazy, Suspense } from 'react';
import { Download, FileText, Image, Music, Video } from 'lucide-react';
import { Attachment, Theme } from '../types';

const PdfAttachmentViewer = lazy(() => import('./PdfAttachmentViewer'));

interface ViewerAttachmentPanelProps {
  attachment: Attachment;
  theme: Theme;
}

export const ViewerAttachmentPanel: React.FC<ViewerAttachmentPanelProps> = ({ attachment, theme }) => (
  <div className={`mt-8 p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#050505] border-cyan-900/30'}`}>
    <div className={`flex items-center gap-2 mb-4 font-mono text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-cyan-600'}`}>
      {attachment.type === 'image' && <Image className="w-4 h-4" />}
      {attachment.type === 'video' && <Video className="w-4 h-4" />}
      {attachment.type === 'audio' && <Music className="w-4 h-4" />}
      {attachment.type === 'pdf' && <FileText className="w-4 h-4" />}
      <span>{attachment.name}</span>
    </div>
    
    <div className="flex justify-center">
      {attachment.type === 'image' && (
        <img src={attachment.data} alt={attachment.name} className="max-w-full rounded-lg shadow-lg border border-slate-200 dark:border-cyan-900/30 max-h-[600px] object-contain" />
      )}
      {attachment.type === 'video' && (
        <video src={attachment.data} controls className="max-w-full rounded-lg shadow-lg" />
      )}
      {attachment.type === 'audio' && (
        <audio src={attachment.data} controls className="w-full" />
      )}
      {attachment.type === 'pdf' && (
        <Suspense
          fallback={
            <div className="w-full flex flex-col items-center overflow-x-auto rounded-lg border border-slate-200 dark:border-cyan-900/30 bg-white p-4">
              <div className="font-mono text-cyan-600 animate-pulse my-10">Loading Document...</div>
            </div>
          }
        >
          <PdfAttachmentViewer file={attachment.data} theme={theme} />
        </Suspense>
      )}
    </div>

    {attachment.type !== 'pdf' && (
      <div className="mt-4 flex justify-end">
        <a
          href={attachment.data}
          download={attachment.name}
          className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono border rounded transition-colors ${theme === 'light' ? 'border-cyan-200 text-cyan-700 hover:bg-cyan-50' : 'border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/30'}`}
        >
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    )}
  </div>
);
