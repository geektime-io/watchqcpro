import React, { useState, useRef, useEffect } from 'react';
import { Upload, RotateCcw, Crosshair, Minus, Plus, Download, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { OverlayConfig, ImageState, AlignmentAnalysis } from '../types';
import { analyzeAlignmentImage } from '../services/geminiService';
import html2canvas from 'html2canvas';

interface QCAlignmentProps {
  imageSrc: string | null;
  onUpload: (file: File) => void;
  onOpenSettings: () => void;
}

const QCAlignment: React.FC<QCAlignmentProps> = ({ imageSrc, onUpload }) => {
  // Image manipulation state
  const [imgState, setImgState] = useState<ImageState>({
    rotation: 0,
    scale: 1,
    x: 0,
    y: 0,
  });

  // Overlay state
  const [overlay, setOverlay] = useState<OverlayConfig>({
    type: 'indices',
    color: '#00CFEF',
    rotation: 0,
    scale: 100,
    offsetX: 0,
    offsetY: 0,
  });

  // AI Analysis State
  const [analysis, setAnalysis] = useState<AlignmentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  
  // Touch state refs
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchPos = useRef<{x: number, y: number} | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent default touch actions to stop page scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Aggressively prevent default on the canvas to stop scrolling
    const preventDefault = (e: TouchEvent) => {
        e.preventDefault();
    };

    // We apply this to the container so ANY touch inside the black area stops scrolling
    container.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
        container.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      setImgState({ rotation: 0, scale: 1, x: 0, y: 0 });
      setAnalysis(null);
    }
  };

  const handleReset = () => {
    setImgState({ rotation: 0, scale: 1, x: 0, y: 0 });
    setOverlay({ ...overlay, rotation: 0, scale: 100, offsetX: 0, offsetY: 0 });
  };

  // --- Mouse Events ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - imgState.x, y: e.clientY - imgState.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setImgState(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    const delta = -Math.sign(e.deltaY) * 0.1; 
    setImgState(prev => {
        const newScale = Math.max(0.1, Math.min(10, prev.scale + delta));
        return { ...prev, scale: newScale };
    });
  };

  // --- Touch Events (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc) return;
    
    if (e.touches.length === 1) {
        // Single touch - Start Drag
        const touch = e.touches[0];
        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        setDragStart({ x: touch.clientX - imgState.x, y: touch.clientY - imgState.y });
        setIsDragging(true);
    } else if (e.touches.length === 2) {
        // Two touches - Start Pinch
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance.current = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!imageSrc) return;
    
    // Double ensure no scrolling happens
    if (e.cancelable) e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
        // Pan
        const touch = e.touches[0];
        setImgState(prev => ({
            ...prev,
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        }));
    } else if (e.touches.length === 2) {
        // Pinch Zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

        if (lastTouchDistance.current !== null) {
            const delta = currentDistance - lastTouchDistance.current;
            const zoomSpeed = 0.005; 
            setImgState(prev => {
                const newScale = Math.max(0.1, Math.min(10, prev.scale + (delta * zoomSpeed)));
                return { ...prev, scale: newScale };
            });
        }
        lastTouchDistance.current = currentDistance;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = null;
    lastTouchPos.current = null;
  };


  const adjustRotation = (delta: number) => {
    setImgState(prev => ({ ...prev, rotation: parseFloat((prev.rotation + delta).toFixed(2)) }));
  };

  const handleSaveImage = async () => {
    if (!containerRef.current || !imageSrc) return;
    setIsSaving(true);

    try {
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#0f172a',
        scale: 3,
        logging: false
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const fontSize = Math.max(24, canvas.width * 0.03);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('qc.geektime.io', canvas.width - 20, canvas.height - 20);
      }

      const link = document.createElement('a');
      link.download = `GeekTime-QC-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error("Failed to save image", error);
      alert("Failed to save image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageSrc) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64Content = base64data.split(',')[1];
            const mimeType = base64data.substring(base64data.indexOf(':') + 1, base64data.indexOf(';'));
            
            try {
                const result = await analyzeAlignmentImage(base64Content, mimeType);
                setAnalysis(result);
            } catch (err: any) {
                console.error(err);
                alert(`AI Analysis Failed: ${err.message}`);
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(blob);

    } catch (e: any) {
        console.error(e);
        alert(`Failed to process image: ${e.message}`);
        setIsAnalyzing(false);
    }
  };

  const renderOverlay = () => {
    // Fix: Use aspect-square and margin-auto to ensure perfect circle/square
    // independently of the container's aspect ratio
    const containerClass = "aspect-square max-h-full max-w-full m-auto relative";

    if (overlay.type === 'indices') {
      return (
        <div className={containerClass}>
          {/* Central Cross */}
          <div className="absolute w-full h-px shadow-sm top-1/2 -translate-y-1/2" style={{ backgroundColor: overlay.color }}></div>
          <div className="absolute h-full w-px shadow-sm left-1/2 -translate-x-1/2" style={{ backgroundColor: overlay.color }}></div>
          
          {/* 12 Hour Markers */}
          <div className="absolute inset-0 flex items-center justify-center">
             {[...Array(6)].map((_, i) => (
                <div 
                 key={i} 
                 className="absolute w-full h-px shadow-sm" 
                 style={{ 
                   backgroundColor: overlay.color, 
                   transform: `rotate(${i * 30}deg)` 
                 }} 
               />
             ))}
          </div>

          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border" style={{ borderColor: overlay.color }}></div>
           {/* Inner Circle Guide */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] rounded-full border opacity-50" style={{ borderColor: overlay.color }}></div>
        </div>
      );
    }

    if (overlay.type === 'grid') {
        return (
            <div className={containerClass}>
                <div 
                    className="w-full h-full border opacity-70" 
                    style={{ 
                        borderColor: overlay.color,
                        backgroundImage: `linear-gradient(${overlay.color} 1px, transparent 1px), linear-gradient(90deg, ${overlay.color} 1px, transparent 1px)`,
                        backgroundSize: '50px 50px',
                        backgroundPosition: 'center center'
                    }}
                ></div>
            </div>
        )
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-950 overflow-hidden">
      
      {/* Main Workspace (Canvas) */}
      <div 
        className="relative order-1 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col flex-grow min-h-0"
      >
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
             <div className="bg-black/60 backdrop-blur-md p-2 rounded-lg pointer-events-auto text-[10px] text-white/70 border border-white/10 shadow-lg">
                {imageSrc ? "Pinch to zoom • Drag to pan" : "Upload to start"}
             </div>
             <button 
                onClick={handleReset}
                className="p-2 bg-[#00CFEF] hover:bg-[#00bce0] text-slate-950 rounded-lg pointer-events-auto shadow-lg transition-colors"
                title="Reset All"
             >
                <RotateCcw size={16} />
             </button>
        </div>

        {/* Interactive Area */}
        <div 
            ref={containerRef}
            className={`flex-1 relative overflow-hidden select-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{ touchAction: 'none' }} // Hard enforce no scrolling
        >
            {!imageSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none z-10 p-8 text-center">
                    <Upload size={48} className="mb-4 opacity-50" />
                    <p className="text-sm">No QC image loaded</p>
                </div>
            )}

            {imageSrc && (
                <>
                  {/* Image Layer */}
                  <div 
                      className="absolute origin-center will-change-transform z-10"
                      style={{
                          transform: `translate(calc(-50% + ${imgState.x}px), calc(-50% + ${imgState.y}px)) rotate(${imgState.rotation}deg) scale(${imgState.scale})`,
                          left: '50%',
                          top: '50%',
                          // Removed explicit constraints to allow better mobile zoom
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          maxHeight: 'none',
                      }}
                  >
                      <img 
                          src={imageSrc} 
                          alt="QC Watch" 
                          className="shadow-2xl pointer-events-none select-none" 
                          style={{ 
                              display: 'block',
                              // Ensure it's large enough on mobile by default
                              minWidth: '100vw', 
                              height: 'auto'
                          }}
                          draggable={false} 
                      />
                  </div>

                  {/* Overlay Layer - Centered Square */}
                  <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden p-4">
                      {renderOverlay()}
                  </div>
                </>
            )}
        </div>
      </div>

      {/* Controls Sidebar */}
      <div className="flex-shrink-0 lg:w-56 w-full bg-slate-950 p-3 border-t lg:border-t-0 lg:border-l border-slate-800 order-2 lg:flex-none overflow-y-auto max-h-[40vh] lg:max-h-none z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {/* Desktop Upload */}
        <div className="hidden lg:block mb-3">
             <label className="cursor-pointer group">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <div className="w-full h-16 border-2 border-dashed border-slate-800 group-hover:border-[#00CFEF] rounded-xl flex flex-col items-center justify-center text-slate-500 group-hover:text-[#00CFEF] transition-all bg-slate-900/50">
                    <Upload size={20} className="mb-1" />
                    <span className="text-[10px] font-semibold uppercase">Click to Upload</span>
                </div>
            </label>
        </div>

        {/* Mobile Upload & Save Group */}
        <div className="lg:hidden mb-3 grid grid-cols-2 gap-2">
             <label className="cursor-pointer block">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <div className="w-full py-2.5 bg-[#00CFEF] hover:bg-[#00bce0] text-slate-950 rounded-lg font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-[#00CFEF]/20 text-xs">
                    <Upload size={16} />
                    Upload
                </div>
            </label>
            
            <button 
                onClick={handleSaveImage}
                disabled={isSaving || !imageSrc}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-xs"
            >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                Save
            </button>
        </div>

        <div className="space-y-3 pb-4">
            {/* Tools Selection */}
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setOverlay({ ...overlay, type: 'indices' })}
                        className={`p-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-1 ${
                            overlay.type === 'indices' 
                            ? 'bg-[#00CFEF]/10 border-[#00CFEF] text-[#00CFEF]' 
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        <Crosshair size={16} />
                        Indices
                    </button>
                    <button 
                         onClick={() => setOverlay({ ...overlay, type: 'grid' })}
                         className={`p-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-1 ${
                            overlay.type === 'grid' 
                            ? 'bg-[#00CFEF]/10 border-[#00CFEF] text-[#00CFEF]' 
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        <div className="grid grid-cols-2 gap-0.5 w-3 h-3 mb-1">
                            <div className="bg-current opacity-50 rounded-[1px]"></div>
                            <div className="bg-current opacity-50 rounded-[1px]"></div>
                            <div className="bg-current opacity-50 rounded-[1px]"></div>
                            <div className="bg-current opacity-50 rounded-[1px]"></div>
                        </div>
                        Grid
                    </button>
                </div>
            </div>

            {/* Adjustments */}
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rotation</h3>
                    <span className="font-mono text-[10px] text-[#00CFEF]">{imgState.rotation}°</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => adjustRotation(-0.1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 text-slate-300"><Minus size={14} /></button>
                    <input 
                        type="range" 
                        min="-45" 
                        max="45" 
                        step="0.1"
                        value={imgState.rotation}
                        onChange={(e) => setImgState({ ...imgState, rotation: parseFloat(e.target.value) })}
                        className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00CFEF]"
                    />
                    <button onClick={() => adjustRotation(0.1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 text-slate-300"><Plus size={14} /></button>
                </div>
            </div>

             {/* AI Analysis Button */}
             <button 
                onClick={handleAnalyze}
                disabled={!imageSrc || isAnalyzing}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:grayscale text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
            >
                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                <span>AI Alignment Check</span>
            </button>

            {/* AI Results */}
            {analysis && (
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 animate-in slide-in-from-bottom-2">
                    <div className={`text-sm font-bold mb-2 flex items-center gap-2 ${
                        analysis.verdict === 'Excellent' ? 'text-emerald-400' : 
                        analysis.verdict === 'Acceptable' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                        {analysis.verdict === 'Excellent' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        Verdict: {analysis.verdict}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">{analysis.summary}</p>
                    {analysis.issues.length > 0 && analysis.issues[0] !== "None" && (
                        <ul className="text-[10px] text-slate-400 list-disc pl-4 space-y-1">
                            {analysis.issues.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="hidden lg:block">
                <button 
                    onClick={handleSaveImage}
                    disabled={isSaving || !imageSrc}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    Save QC Image
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default QCAlignment;
