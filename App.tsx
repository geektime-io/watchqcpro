import React, { useState } from 'react';
import { Watch, Activity, CheckSquare } from 'lucide-react';
import QCAlignment from './components/QCAlignment';
import Timegrapher from './components/Timegrapher';
import { QCMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<QCMode>(QCMode.ALIGNMENT);
  const [alignmentImage, setAlignmentImage] = useState<string | null>(null);
  const [timegrapherImage, setTimegrapherImage] = useState<string | null>(null);
  
  // API Key Hardcoded as requested
  const apiKey = "AIzaSyCNU0gkJblt4mI8xq6fP-ATROv2p0zvCC0";

  // Using URL.createObjectURL ensures the browser uses the original file reference
  const handleImageUpload = (file: File, targetMode: QCMode) => {
    const objectUrl = URL.createObjectURL(file);
    
    if (targetMode === QCMode.ALIGNMENT) {
      if (alignmentImage && alignmentImage.startsWith('blob:')) {
        URL.revokeObjectURL(alignmentImage);
      }
      setAlignmentImage(objectUrl);
    } else {
      if (timegrapherImage && timegrapherImage.startsWith('blob:')) {
        URL.revokeObjectURL(timegrapherImage);
      }
      setTimegrapherImage(objectUrl);
    }
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 shrink-0 z-40 relative">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#00CFEF] p-1.5 rounded-lg shadow-lg shadow-[#00CFEF]/20">
              <Watch className="text-slate-950" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">GEEKTIME <span className="text-[#00CFEF]">QC</span></h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setMode(QCMode.ALIGNMENT)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                  mode === QCMode.ALIGNMENT
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare size={14} />
                <span className="">Alignment</span>
              </button>
              <button
                onClick={() => setMode(QCMode.TIMEGRAPHER)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                  mode === QCMode.TIMEGRAPHER
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity size={14} />
                <span className="">Timegrapher</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {mode === QCMode.ALIGNMENT ? (
          <QCAlignment 
            imageSrc={alignmentImage} 
            onUpload={(f) => handleImageUpload(f, QCMode.ALIGNMENT)} 
            apiKey={apiKey}
            onOpenSettings={() => {}} // No-op since settings are removed
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Timegrapher 
              imageSrc={timegrapherImage}
              onUpload={(f) => handleImageUpload(f, QCMode.TIMEGRAPHER)}
              apiKey={apiKey}
              onOpenSettings={() => {}} // No-op
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
