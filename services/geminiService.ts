
import { GoogleGenAI, Type } from "@google/genai";
import { GameTheme, AIQuote } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchAITetrisConfig(): Promise<{ theme: GameTheme; quote: AIQuote }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a futuristic Tetris game theme (name, Tailwind background class, and specific hex colors for I, J, L, O, S, T, Z pieces) and a short motivational quote about fitting in or stacking high.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                background: { type: Type.STRING },
                sidebarBg: { type: Type.STRING },
                pieceColors: {
                  type: Type.OBJECT,
                  properties: {
                    I: { type: Type.STRING },
                    J: { type: Type.STRING },
                    L: { type: Type.STRING },
                    O: { type: Type.STRING },
                    S: { type: Type.STRING },
                    T: { type: Type.STRING },
                    Z: { type: Type.STRING }
                  },
                  required: ["I", "J", "L", "O", "S", "T", "Z"]
                },
                accent: { type: Type.STRING }
              },
              required: ["name", "background", "sidebarBg", "pieceColors", "accent"]
            },
            quote: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                author: { type: Type.STRING }
              },
              required: ["text", "author"]
            }
          },
          required: ["theme", "quote"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      theme: {
        name: "Deep Space",
        background: "bg-slate-950",
        sidebarBg: "bg-slate-900/90",
        pieceColors: {
          I: "#22d3ee",
          J: "#3b82f6",
          L: "#f59e0b",
          O: "#eab308",
          S: "#22c55e",
          T: "#a855f7",
          Z: "#ef4444"
        },
        accent: "text-blue-400"
      },
      quote: {
        text: "In a world of blocks, be the one that completes the line.",
        author: "The Architect"
      }
    };
  }
}
