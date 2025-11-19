import { GoogleGenAI, Type } from "@google/genai";
import { TimegrapherMetrics, AlignmentAnalysis } from "../types";

const getGenAI = (apiKey: string) => {
    if (!apiKey) throw new Error("API Key is missing. Please set it in the settings.");
    return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes a timegrapher image to extract metrics.
 */
export const analyzeTimegrapherImage = async (base64Image: string, mimeType: string, apiKey: string): Promise<TimegrapherMetrics> => {
  const ai = getGenAI(apiKey);

  try {
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
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze timegrapher image. Please check your API Key or try again.");
  }
};

/**
 * Analyzes a watch face for alignment issues.
 */
export const analyzeAlignmentImage = async (base64Image: string, mimeType: string, apiKey: string): Promise<AlignmentAnalysis> => {
    const ai = getGenAI(apiKey);
  
    try {
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
    } catch (error) {
      console.error("Gemini Alignment Analysis Error:", error);
      throw new Error("Failed to analyze alignment. Please check your API Key.");
    }
  };