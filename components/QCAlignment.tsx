import React, { useState, useRef, useEffect } from 'react';
import { Upload, RotateCcw, Crosshair, Minus, Plus, Download, Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { OverlayConfig, ImageState, AlignmentAnalysis } from '../types';
import { analyzeAlignmentImage, compressImage } from '../services/geminiService';
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
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
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
    setError(null);

    try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        
        // Compress image before sending to AI
        // This is critical for mobile devices to avoid timeouts and payload limits
        const { base64, mimeType } = await compressImage(blob);
        
        const result = await analyzeAlignmentImage(base64, mimeType);
        setAnalysis(result);

    } catch (e: any) {
        console.error(e);
        setError(e.message || "AI Analysis Failed");
    } finally {
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
             <div className="flex gap-2">
                {imageSrc && (
                    <button 
                        onClick={handleSaveImage}
                        disabled={isSaving}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg pointer-events-auto shadow-lg transition-colors border border-white/10"
                        title="Save Image"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                    </button>
                )}
                <button 
                    onClick={handleReset}
                    className="p-2 bg-[#00CFEF] hover:bg-[#00bce0] text-slate-950 rounded-lg pointer-events-auto shadow-lg transition-colors"
                    title="Reset All"
                >
                    <RotateCcw size={16} />
                </button>
             </div>
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

                  {/* Overlay Layer (Fixed position relative to canvas center, but scalable/rotatable) */}
                  <div 
                    className="absolute z-20 pointer-events-none"
                    style={{
                        left: '50%',
                        top: '50%',
                        width: `${overlay.scale}%`, // Relative to container width
                        height: `${overlay.scale}%`,
                        transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) translate(${overlay.offsetX}px, ${overlay.offsetY}px)`,
                    }}
                  >
                      {renderOverlay()}
                  </div>
                </>
            )}
        </div>
      </div>

      {/* Controls Sidebar */}
      <div className="order-2 lg:w-80 bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-[45vh] lg:h-auto shrink-0">
        <div className="p-4 flex-1 overflow-y-auto">
            
            {/* File Upload */}
            <div className="mb-6">
                <label className="block w-full cursor-pointer group">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="flex items-center justify-center w-full p-3 border border-dashed border-slate-700 rounded-lg text-slate-400 group-hover:text-[#00CFEF] group-hover:border-[#00CFEF] transition-colors gap-2">
                        <Upload size={16} />
                        <span className="text-sm font-medium">{imageSrc ? "Change Image" : "Upload QC Image"}</span>
                    </div>
                </label>
            </div>

            {/* AI Analysis Section */}
            <div className="mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-3">
                     <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <Sparkles className="text-[#00CFEF]" size={16} />
                        AI Alignment Check
                     </h3>
                </div>

                {!analysis && !isAnalyzing && (
                    <button 
                        onClick={handleAnalyze}
                        disabled={!imageSrc}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-2"
                    >
                        Analyze Alignment
                    </button>
                )}

                {isAnalyzing && (
                     <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
                        <Loader2 className="animate-spin text-[#00CFEF]" size={18} />
                        Analyzing structure...
                     </div>
                )}
                
                {error && (
                    <div className="mt-2 p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg flex items-start gap-2 text-rose-200 text-xs">
                        <XCircle className="shrink-0 mt-0.5" size={14} />
                        <span>{error}</span>
                    </div>
                )}

                {analysis && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs">Verdict</span>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                                analysis.verdict === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                                analysis.verdict === 'Reject' ? 'bg-rose-500/20 text-rose-400' :
                                'bg-amber-500/20 text-amber-400'
                            }`}>
                                {analysis.verdict}
                            </span>
                        </div>
                        
                        <div className="text-xs text-slate-300 leading-relaxed border-l-2 border-[#00CFEF] pl-2">
                            {analysis.summary}
                        </div>

                        {analysis.issues && analysis.issues.length > 0 && analysis.issues[0] !== "None" && (
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Detected Issues</p>
                                {analysis.issues.map((issue, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5 text-xs text-rose-300">
                                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                        <span>{issue}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Manual Tools */}
            <div className="space-y-5">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Manual Overlay</h3>
                
                {/* Tool Type */}
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setOverlay(p => ({...p, type: 'indices'}))}
                        className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${overlay.type === 'indices' ? 'bg-[#00CFEF]/10 border-[#00CFEF] text-[#00CFEF]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <Crosshair size={14} />
                        Indices
                    </button>
                    <button 
                        onClick={() => setOverlay(p => ({...p, type: 'grid'}))}
                        className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${overlay.type === 'grid' ? 'bg-[#00CFEF]/10 border-[#00CFEF] text-[#00CFEF]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <div className="w-3 h-3 grid grid-cols-2 gap-px bg-current opacity-50"><div className="bg-transparent"></div></div>
                        Grid
                    </button>
                </div>

                {/* Color Picker */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {['#00CFEF', '#EF4444', '#10B981', '#F59E0B', '#FFFFFF'].map(c => (
                        <button
                            key={c}
                            onClick={() => setOverlay(p => ({...p, color: c}))}
                            className={`w-6 h-6 rounded-full shrink-0 border-2 transition-all ${overlay.color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                {/* Controls */}
                <div className="space-y-4">
                    {/* Rotation */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Rotation</span>
                            <span>{overlay.rotation}°</span>
                        </div>
                        <input 
                            type="range" 
                            min="-15" max="15" step="0.1" 
                            value={overlay.rotation}
                            onChange={(e) => setOverlay(p => ({...p, rotation: parseFloat(e.target.value)}))}
                            className="w-full accent-[#00CFEF] h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Scale */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Scale</span>
                            <span>{overlay.scale}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="50" max="150" step="1" 
                            value={overlay.scale}
                            onChange={(e) => setOverlay(p => ({...p, scale: parseFloat(e.target.value)}))}
                            className="w-full accent-[#00CFEF] h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Nudge Controls */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 text-center uppercase">Vertical</span>
                            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800">
                                <button onClick={() => setOverlay(p => ({...p, offsetY: p.offsetY - 1}))} className="flex-1 p-2 hover:bg-slate-800 text-slate-400"><Minus size={12} className="mx-auto"/></button>
                                <span className="text-xs font-mono w-8 text-center">{overlay.offsetY}</span>
                                <button onClick={() => setOverlay(p => ({...p, offsetY: p.offsetY + 1}))} className="flex-1 p-2 hover:bg-slate-800 text-slate-400"><Plus size={12} className="mx-auto"/></button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 text-center uppercase">Horizontal</span>
                            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800">
                                <button onClick={() => setOverlay(p => ({...p, offsetX: p.offsetX - 1}))} className="flex-1 p-2 hover:bg-slate-800 text-slate-400"><Minus size={12} className="mx-auto"/></button>
                                <span className="text-xs font-mono w-8 text-center">{overlay.offsetX}</span>
                                <button onClick={() => setOverlay(p => ({...p, offsetX: p.offsetX + 1}))} className="flex-1 p-2 hover:bg-slate-800 text-slate-400"><Plus size={12} className="mx-auto"/></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default QCAlignment;
