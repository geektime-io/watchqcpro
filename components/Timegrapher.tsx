import React, { useState } from 'react';
import { Upload, Activity, CheckCircle, AlertCircle, Info, Loader2, Key } from 'lucide-react';
import { analyzeTimegrapherImage } from '../services/geminiService';
import { TimegrapherMetrics } from '../types';

interface TimegrapherProps {
  imageSrc: string | null;
  onUpload: (file: File) => void;
  apiKey: string;
  onOpenSettings: () => void;
}

const Timegrapher: React.FC<TimegrapherProps> = ({ imageSrc, onUpload, apiKey, onOpenSettings }) => {
  const [metrics, setMetrics] = useState<TimegrapherMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!imageSrc) return;
    
    if (!apiKey) {
        setError("Please enter your Google API Key in Settings to use AI analysis.");
        onOpenSettings();
        return;
    }

    setLoading(true);
    setError(null);
    setMetrics(null);

    try {
      // Convert src to base64 raw content for the API
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Remove data:image/png;base64, prefix
        const base64Content = base64data.split(',')[1];
        const mimeType = base64data.substring(base64data.indexOf(':') + 1, base64data.indexOf(';'));
        
        try {
            const result = await analyzeTimegrapherImage(base64Content, mimeType, apiKey);
            setMetrics(result);
        } catch (err: any) {
            setError(err.message || "Analysis failed");
        } finally {
            setLoading(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setError("Could not process image");
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      setMetrics(null); // Reset metrics on new image
      setError(null);
    }
  };

  const getMetricStatus = (type: 'rate' | 'amp' | 'beat', value: number) => {
    switch(type) {
        case 'rate':
            // Acceptable: -10 to +10 is typical generic QC standard, ideal is -5 to +5
            if (Math.abs(value) <= 5) return 'good';
            if (Math.abs(value) <= 15) return 'warn';
            return 'bad';
        case 'amp':
            // Good: 250-310, Warn: 230-250 or >310, Bad: <230
            if (value >= 250 && value <= 320) return 'good';
            if (value >= 230) return 'warn';
            return 'bad';
        case 'beat':
             // Good: 0.0-0.2, Warn: 0.3-0.5, Bad: >0.5
             if (value <= 0.2) return 'good';
             if (value <= 0.5) return 'warn';
             return 'bad';
    }
    return 'warn';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'good') return <CheckCircle className="text-emerald-500" size={20} />;
    if (status === 'warn') return <AlertCircle className="text-amber-500" size={20} />;
    return <AlertCircle className="text-rose-500" size={20} />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Upload & Image */}
        <div className="space-y-6">
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
                {imageSrc ? (
                    <img src={imageSrc} alt="Timegrapher" className="max-w-full max-h-[400px] object-contain rounded" />
                ) : (
                    <div className="text-center text-slate-500 p-8">
                        <Activity size={48} className="mx-auto mb-4 opacity-40" />
                        <p className="text-lg font-medium">Upload Timegrapher Photo</p>
                        <p className="text-sm mt-2">AI will extract Rate, Amplitude, and Beat Error.</p>
                    </div>
                )}
             </div>

             <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-center text-sm font-medium transition-colors flex items-center justify-center gap-2 text-[#00CFEF]">
                        <Upload size={18} />
                        {imageSrc ? "Change Photo" : "Upload Photo"}
                    </div>
                </label>
                
                {imageSrc && (
                    <button 
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="flex-1 py-3 px-4 bg-[#00CFEF] hover:bg-[#00bce0] disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#00CFEF]/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
                        {loading ? "Analyzing..." : "Analyze with AI"}
                    </button>
                )}
             </div>
             
             {!apiKey && (
                 <div 
                    onClick={onOpenSettings}
                    className="cursor-pointer bg-[#00CFEF]/10 border border-[#00CFEF]/30 rounded-lg p-3 flex items-center gap-3 text-[#00CFEF] hover:bg-[#00CFEF]/20 transition-colors"
                 >
                     <Key size={16} />
                     <p className="text-xs">AI features require an API Key. <strong>Click here to set it.</strong></p>
                 </div>
             )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg h-full">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Info className="text-[#00CFEF]" /> Analysis Results
                </h3>

                {error && (
                    <div className="bg-rose-950/30 border border-rose-900 text-rose-200 p-4 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                {!metrics && !loading && !error && (
                    <div className="text-slate-500 text-sm italic">
                        Upload an image and click Analyze to see metrics.
                    </div>
                )}

                {loading && (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-12 bg-slate-800 rounded w-full"></div>
                        <div className="h-12 bg-slate-800 rounded w-full"></div>
                        <div className="h-12 bg-slate-800 rounded w-full"></div>
                    </div>
                )}

                {metrics && (
                    <div className="space-y-4">
                        {/* Rate */}
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider">Rate</p>
                                <p className="text-2xl font-mono text-white">{metrics.rate > 0 ? '+' : ''}{metrics.rate} s/d</p>
                            </div>
                            <StatusIcon status={getMetricStatus('rate', metrics.rate)} />
                        </div>

                        {/* Amplitude */}
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                             <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider">Amplitude</p>
                                <p className="text-2xl font-mono text-white">{metrics.amplitude}°</p>
                            </div>
                            <StatusIcon status={getMetricStatus('amp', metrics.amplitude)} />
                        </div>

                        {/* Beat Error */}
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                             <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider">Beat Error</p>
                                <p className="text-2xl font-mono text-white">{metrics.beatError} ms</p>
                            </div>
                            <StatusIcon status={getMetricStatus('beat', metrics.beatError)} />
                        </div>

                        {/* AI Summary */}
                        <div className="mt-6 pt-6 border-t border-slate-800">
                            <p className="text-[#00CFEF] text-xs font-bold uppercase mb-2">AI Assessment</p>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {metrics.analysis}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Timegrapher;