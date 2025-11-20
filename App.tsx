import React, { useState, useEffect } from 'react';
import { Watch, Activity, CheckSquare, Wifi, AlertTriangle } from 'lucide-react';
import QCAlignment from './components/QCAlignment';
import Timegrapher from './components/Timegrapher';
import { QCMode } from './types';
import { checkApiKey } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<QCMode>(QCMode.ALIGNMENT);
  const [alignmentImage, setAlignmentImage] = useState<string | null>(null);
  const [timegrapherImage, setTimegrapherImage] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(checkApiKey());
  }, []);
  
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
    <div className="h-[100dvh] bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 shrink-0 z-40 relative">
        <div className="max-w-full mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a 
              href="https://geektime.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 group hover:opacity-90 transition-opacity"
            >
                <div className="bg-[#00CFEF] p-1.5 rounded-lg shadow-lg shadow-[#00CFEF]/20 group-hover:scale-105 transition-transform">
                  <Watch className="text-slate-950" size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight group-hover:text-[#00CFEF] transition-colors">
                    SHOP ON <span className="text-[#00CFEF] group-hover:text-white transition-colors">GEEKTIME</span>
                  </h1>
                </div>
            </a>

            {/* System Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800 border border-slate-700 ml-2">
                <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`}></div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {hasKey ? 'System Ready' : 'No API Key'}
                </span>
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
                <span className="hidden sm:inline">Alignment</span>
                <span className="sm:hidden">Align</span>
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
                <span className="hidden sm:inline">Timegrapher</span>
                <span className="sm:hidden">Timer</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Status Banner if Key Missing */}
        {!hasKey && (
            <div className="bg-rose-600 text-white text-[10px] py-1 px-4 text-center font-bold uppercase tracking-wider">
                API Key Config Missing - AI Features Disabled
            </div>
        )}
      </header>

      {/* Main Content - Use flex-1 to fill remaining height */}
      <main className="flex-1 relative flex flex-col overflow-hidden min-h-0">
        {mode === QCMode.ALIGNMENT ? (
          <QCAlignment 
            imageSrc={alignmentImage} 
            onUpload={(f) => handleImageUpload(f, QCMode.ALIGNMENT)} 
            onOpenSettings={() => {}} 
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Timegrapher 
              imageSrc={timegrapherImage}
              onUpload={(f) => handleImageUpload(f, QCMode.TIMEGRAPHER)}
              onOpenSettings={() => {}} 
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
