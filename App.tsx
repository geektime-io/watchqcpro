import React, { useState, useEffect } from 'react';
import { Watch, Activity, CheckSquare, Settings, X, Key } from 'lucide-react';
import QCAlignment from './components/QCAlignment';
import Timegrapher from './components/Timegrapher';
import { QCMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<QCMode>(QCMode.ALIGNMENT);
  const [alignmentImage, setAlignmentImage] = useState<string | null>(null);
  const [timegrapherImage, setTimegrapherImage] = useState<string | null>(null);
  
  // API Key Management
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Load API key from local storage on mount
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  // Using URL.createObjectURL ensures the browser uses the original file reference
  // This prevents any compression that might occur during Base64 conversion strings,
  // and is much more performant for high-res images.
  const handleImageUpload = (file: File, targetMode: QCMode) => {
    const objectUrl = URL.createObjectURL(file);
    
    if (targetMode === QCMode.ALIGNMENT) {
      // Clean up previous blob URL to prevent memory leaks
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
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#00CFEF] p-2 rounded-lg shadow-lg shadow-[#00CFEF]/20">
              <Watch className="text-slate-950" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">GEEKTIME <span className="text-[#00CFEF]">QC</span></h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Quality Control Tool</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 mr-2">
              <button
                onClick={() => setMode(QCMode.ALIGNMENT)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  mode === QCMode.ALIGNMENT
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare size={16} />
                <span className="hidden sm:inline">Alignment</span>
              </button>
              <button
                onClick={() => setMode(QCMode.TIMEGRAPHER)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  mode === QCMode.TIMEGRAPHER
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity size={16} />
                <span className="hidden sm:inline">Timegrapher AI</span>
              </button>
            </div>

            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings size={20} className="text-[#00CFEF]" /> Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Key size={14} /> Google Gemini API Key
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => handleSaveKey(e.target.value)}
                  placeholder="Enter AI Studio API Key"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00CFEF] focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Required for AI Timegrapher analysis. Key is stored locally in your browser.
                </p>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-[#00CFEF] hover:text-[#00bce0] hover:underline mt-1 inline-block"
                >
                  Get a free API key here &rarr;
                </a>
              </div>
              
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-[#00CFEF] hover:bg-[#00bce0] text-slate-950 rounded-lg font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {mode === QCMode.ALIGNMENT ? (
          <QCAlignment 
            imageSrc={alignmentImage} 
            onUpload={(f) => handleImageUpload(f, QCMode.ALIGNMENT)} 
            apiKey={apiKey}
            onOpenSettings={() => setShowSettings(true)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Timegrapher 
              imageSrc={timegrapherImage}
              onUpload={(f) => handleImageUpload(f, QCMode.TIMEGRAPHER)}
              apiKey={apiKey}
              onOpenSettings={() => setShowSettings(true)}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
