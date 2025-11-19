import React, { useState, useRef } from 'react';
import { Upload, RotateCcw, Crosshair, Minus, Plus, Download, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { OverlayConfig, ImageState, AlignmentAnalysis } from '../types';
import { analyzeAlignmentImage } from '../services/geminiService';
import html2canvas from 'html2canvas';

interface QCAlignmentProps {
  imageSrc: string | null;
  onUpload: (file: File) => void;
  apiKey: string;
  onOpenSettings: () => void;
}

const QCAlignment: React.FC<QCAlignmentProps> = ({ imageSrc, onUpload, apiKey, onOpenSettings }) => {
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
    color: '#00CFEF', // Default color updated to cyan
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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      // Reset state on new upload
      setImgState({ rotation: 0, scale: 1, x: 0, y: 0 });
      setAnalysis(null); // Reset analysis
    }
  };

  // Reset View
  const handleReset = () => {
    setImgState({ rotation: 0, scale: 1, x: 0, y: 0 });
    setOverlay({ ...overlay, rotation: 0, scale: 100, offsetX: 0, offsetY: 0 });
  };

  // Panning logic for the image
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

  // Zoom logic (Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    const delta = -Math.sign(e.deltaY) * 0.1; 
    setImgState(prev => {
        // Increased max scale to 10 for deep inspection of high-res images
        const newScale = Math.max(0.1, Math.min(10, prev.scale + delta));
        return { ...prev, scale: newScale };
    });
  };

  const adjustRotation = (delta: number) => {
    setImgState(prev => ({ ...prev, rotation: parseFloat((prev.rotation + delta).toFixed(2)) }));
  };

  const handleSaveImage = async () => {
    if (!containerRef.current || !imageSrc) return;
    setIsSaving(true);

    try {
      // Use html2canvas to capture the container
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#0f172a', // Match slate-950
        scale: 3, // Increased quality multiplier
        logging: false
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Add Watermark
        const fontSize = Math.max(24, canvas.width * 0.03);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('qc.geektime.io', canvas.width - 20, canvas.height - 20);
      }

      // Trigger download
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
    if (!apiKey) {
        onOpenSettings();
        return;
    }
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
                const result = await analyzeAlignmentImage(base64Content, mimeType, apiKey);
                setAnalysis(result);
            } catch (err) {
                console.error(err);
                alert("AI Analysis Failed. Check your API Key.");
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(blob);

    } catch (e) {
        console.error(e);
        alert("Failed to process image for AI analysis.");
        setIsAnalyzing(false);
    }
  };

  // Render different overlays
  const renderOverlay = () => {
    // Base style for the drawing container
    // Using w-[800px] h-[800px] ensures consistent thickness regardless of screen size, 
    // but we center it in the overlay layer.
    const rulerSize = 800; 
    
    const drawingStyle = {
        width: `${rulerSize}px`,
        height: `${rulerSize}px`,
        position: 'relative' as const,
    };

    if (overlay.type === 'indices') {
      return (
        <div style={drawingStyle} className="flex items-center justify-center">
          {/* Central Cross - Thinner (1px) */}
          <div className="absolute w-full h-px shadow-sm" style={{ backgroundColor: overlay.color }}></div>
          <div className="absolute h-full w-px shadow-sm" style={{ backgroundColor: overlay.color }}></div>
          {/* 12 Hour Markers radiating out - Thinner (1px) */}
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
          {/* Center Circle - Thinner border */}
          <div className="absolute w-4 h-4 rounded-full border" style={{ borderColor: overlay.color }}></div>
           {/* Inner Circle Guide - Thinner border */}
           <div className="absolute w-2/3 h-2/3 rounded-full border opacity-50" style={{ borderColor: overlay.color }}></div>
        </div>
      );
    }

    if (overlay.type === 'grid') {
        return (
            <div style={drawingStyle} className="flex flex-wrap content-center justify-center">
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
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-950">
      
      {/* Main Workspace (Canvas) */}
      <div 
        className="relative flex-shrink-0 lg:flex-1 order-1 lg:order-1 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-[50vh] lg:h-auto"
      >
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
             <div className="bg-black/60 backdrop-blur-md p-2 rounded-lg pointer-events-auto text-xs text-white/70 border border-white/10">
                {imageSrc ? "Drag to pan • Scroll to zoom" : "Upload to start"}
             </div>
             <button 
                onClick={handleReset}
                className="p-2 bg-[#00CFEF] hover:bg-[#00bce0] text-slate-950 rounded-lg pointer-events-auto shadow-lg transition-colors"
                title="Reset All"
             >
                <RotateCcw size={18} />
             </button>
        </div>

        {/* Interactive Area */}
        <div 
            ref={containerRef}
            className={`flex-1 relative overflow-hidden select-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {!imageSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none z-10">
                    <Upload size={48} className="mb-4 opacity-50" />
                    <p>No QC image loaded</p>
                    <p className="text-xs text-slate-600 mt-2">Upload from the sidebar</p>
                </div>
            )}

            {imageSrc && (
                <>
                  {/* Image Layer - Transformed by user interactions */}
                  {/* Z-Index 10: Below overlay */}
                  <div 
                      className="absolute origin-center will-change-transform z-10"
                      style={{
                          transform: `translate(calc(-50% + ${imgState.x}px), calc(-50% + ${imgState.y}px)) rotate(${imgState.rotation}deg) scale(${imgState.scale})`,
                          left: '50%',
                          top: '50%',
                          width: '0px', 
                          height: '0px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                      }}
                  >
                      <img 
                          src={imageSrc} 
                          alt="QC Watch" 
                          className="shadow-2xl pointer-events-none" 
                          style={{ 
                              minWidth: '300px',
                              maxWidth: '95vw', 
                              maxHeight: '95vh',
                              width: 'auto', 
                              height: 'auto' 
                          }}
                          draggable={false} 
                      />
                  </div>

                  {/* Overlay Layer - Static Reference */}
                  {/* Z-Index 20: Above image. Pointer events NONE to allow clicking through to image. */}
                  <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
                      {renderOverlay()}
                  </div>
                </>
            )}
        </div>
      </div>

      {/* Controls Sidebar */}
      {/* Mobile: Takes remaining height */}
      {/* Desktop: Fixed width w-56 (224px), Compact layout */}
      <div className="flex-shrink-0 lg:w-56 w-full bg-slate-950 p-2 lg:p-3 border-t lg:border-t-0 lg:border-l border-slate-800 order-2 lg:order-2 overflow-y-auto flex-1 lg:flex-none lg:h-auto">
        
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
        <div className="lg:hidden mb-4 space-y-2">
             <label className="cursor-pointer block">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <div className="w-full py-3 bg-[#00CFEF] hover:bg-[#00bce0] text-slate-950 rounded-lg font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-[#00CFEF]/20">
                    <Upload size={18} />
                    Upload Image
                </div>
            </label>
            
            <button 
                onClick={handleSaveImage}
                disabled={isSaving || !imageSrc}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {isSaving ? "Saving..." : "Save Analysis"}
            </button>
        </div>

        <div className="space-y-3">
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
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Adjustment</h3>
                
                {/* Rotation */}
                <div>
                    <div className="flex justify-between text-[10px] mb-1.5 text-slate-300">
                        <span>Rotation</span>
                        <span className="font-mono text-[#00CFEF]">{imgState.rotation}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => adjustRotation(-0.1)} className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-slate-300"><Minus size={12} /></button>
                        <input 
                            type="range" 
                            min="-45" 
                            max="45" 
                            step="0.1"
                            value={imgState.rotation}
                            onChange={(e) => setImgState({ ...imgState, rotation: parseFloat(e.target.value) })}
                            className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00CFEF]"
                        />
                        <button onClick={() => adjustRotation(0.1)} className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-slate-300"><Plus size={12} /></button>
                    </div>
                </div>

                 {/* Overlay Color */}
                 <div>
                    <div className="flex justify-between text-[10px] mb-1.5 text-slate-300">
                        <span>Ruler Color</span>
                    </div>
                    <div className="flex gap-2">
                        {['#00CFEF', '#ef4444', '#22c55e', '#eab308', '#ffffff'].map(color => (
                            <button
                                key={color}
                                onClick={() => setOverlay({ ...overlay, color })}
                                className={`w-5 h-5 rounded-full border-2 ${overlay.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                 <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !imageSrc}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700 text-xs"
                >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} className="text-purple-400" />}
                    {isAnalyzing ? "Analyzing..." : "AI Alignment"}
                </button>

                {/* Desktop Save Button - Hidden on Mobile */}
                <button 
                    onClick={handleSaveImage}
                    disabled={isSaving || !imageSrc}
                    className="hidden lg:flex w-full py-2.5 bg-[#00CFEF] hover:bg-[#00bce0] disabled:opacity-50 text-slate-950 rounded-lg font-bold transition-colors items-center justify-center gap-2 shadow-lg shadow-[#00CFEF]/20 text-xs"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                    {isSaving ? "Saving..." : "Save Analysis"}
                </button>
            </div>

            {/* AI Results Panel */}
            {analysis && (
                <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-3 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white flex items-center gap-2 text-xs">
                            <Sparkles size={14} className="text-[#00CFEF]" /> Verdict
                        </h4>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            analysis.verdict === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                            analysis.verdict === 'Acceptable' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-rose-500/20 text-rose-400'
                        }`}>
                            {analysis.verdict.toUpperCase()}
                        </span>
                    </div>
                    
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                        {analysis.summary}
                    </p>

                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Issues</p>
                        {analysis.issues.length === 0 || (analysis.issues.length === 1 && analysis.issues[0].toLowerCase() === 'none') ? (
                             <div className="flex items-center gap-2 text-emerald-400 text-[10px]">
                                <CheckCircle2 size={12} /> No visible issues
                             </div>
                        ) : (
                            analysis.issues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-slate-300 text-[10px]">
                                    <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                    <span>{issue}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QCAlignment;
