import { GoogleGenAI, Type } from "@google/genai";
import { TimegrapherMetrics, AlignmentAnalysis } from "../types";

const getGenAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY is missing. Please set it in your environment variables.");
        throw new Error("API Key is missing. Please configure the API_KEY environment variable.");
    }
    // Use process.env.API_KEY directly as required by guidelines
    return new GoogleGenAI({ apiKey });
};

/**
 * Helper to compress image before sending to AI.
 * Optimized for Mobile: Uses URL.createObjectURL instead of FileReader to save memory.
 */
export const compressImage = (blob: Blob, maxWidth: number = 1024): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        // Use createObjectURL which is much lighter on memory than FileReader for large images
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl); // Clean up memory immediately
            
            const elem = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions keeping aspect ratio
            if (width > maxWidth || height > maxWidth) {
                if (width > height) {
                    height *= maxWidth / width;
                    width = maxWidth;
                } else {
                    width *= maxWidth / height;
                    height = maxWidth;
                }
            }

            elem.width = width;
            elem.height = height;
            const ctx = elem.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG at 80% quality
            const dataUrl = elem.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, mimeType: 'image/jpeg' });
        };
        
        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image for compression"));
        };

        img.src = objectUrl;
    });
};

/**
 * Analyzes a timegrapher image to extract metrics.
 */
export const analyzeTimegrapherImage = async (base64Image: string, mimeType: string): Promise<TimegrapherMetrics> => {
  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this watch timegrapher screen. 
            Extract the Rate (s/d), Amplitude (degrees), and Beat Error (ms). 
            Also provide a brief, professional 1-sentence analysis of whether these numbers are acceptable for a standard mechanical movement (e.g., Rate +/- 10s/d, Amp > 250, Beat Error < 0.5ms).`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rate: { type: Type.NUMBER, description: "The rate in seconds per day (can be negative)." },
            amplitude: { type: Type.NUMBER, description: "The amplitude in degrees." },
            beatError: { type: Type.NUMBER, description: "The beat error in milliseconds." },
            analysis: { type: Type.STRING, description: "A brief professional assessment of the health of the movement." },
          },
          required: ["rate", "amplitude", "beatError", "analysis"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as TimegrapherMetrics;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    const errorMessage = error.message || "Unknown error";
    if (errorMessage.includes("API Key")) {
        throw new Error(errorMessage);
    }
    throw new Error(`Analysis failed: ${errorMessage}`);
  }
};

/**
 * Analyzes a watch face for alignment issues.
 */
export const analyzeAlignmentImage = async (base64Image: string, mimeType: string): Promise<AlignmentAnalysis> => {
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: `You are a professional Watch Quality Control (QC) expert. Analyze this watch face image strictly for alignment issues.
              
              Focus on:
              1. Hour Markers: Are the 12, 3, 6, 9 markers straight and centered? Are other indices aligned with the minute track?
              2. Date Wheel: Is the date number perfectly centered in the window (not too high, low, left, or right)?
              3. Bezel: Does the bezel triangle/pip align perfectly with the 12 o'clock marker?
              4. SEL (Solid End Links): Are there large gaps?
              5. Rehaut: Is the engraving aligned with the dial markers (if visible)?
  
              Provide:
              - A list of specific alignment issues found (or "None" if perfect).
              - A Verdict: 'Excellent' (No visible issues), 'Acceptable' (Minor flaws invisible to naked eye), or 'Reject' (Obvious flaws).
              - A short professional summary suitable for a QC report.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING, enum: ["Excellent", "Acceptable", "Reject"] },
              issues: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "List of specific alignment observations or defects."
              },
              summary: { type: Type.STRING, description: "Professional summary of the alignment check." },
            },
            required: ["verdict", "issues", "summary"],
          },
        },
      });
  
      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      return JSON.parse(text) as AlignmentAnalysis;
    } catch (error: any) {
      console.error("Gemini Alignment Analysis Error:", error);
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("API Key")) {
          throw new Error(errorMessage);
      }
      throw new Error(`Alignment check failed: ${errorMessage}`);
    }
  };
