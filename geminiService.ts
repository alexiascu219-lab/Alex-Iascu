
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, AnalysisResult } from "./types";

// Helper to get API Key safely
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key || key === 'undefined') {
    console.error("Gemini API Key is missing. Please set API_KEY in your deployment environment variables.");
    return null;
  }
  return key;
};

export const analyzeItemImage = async (base64Image: string): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not configured");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Identify this item from the photo. Provide a suggested name, a short category (e.g., Tools, Collectibles, Electronics), and a brief description.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["name", "category", "description"],
      },
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { name: "New Item", category: "General", description: "" };
  }
};

export const chatWithInventory = async (
  query: string, 
  inventory: InventoryItem[], 
  history: { role: 'user' | 'model', text: string }[]
) => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key is missing. Please check your deployment settings.";

  const ai = new GoogleGenAI({ apiKey });
  const inventoryContext = inventory.map(item => 
    `- Item: ${item.name}, Location: ${item.location}, Category: ${item.category}`
  ).join('\n');

  const systemInstruction = `
    You are the Won-It Storage Assistant. You help users find items in their storage.
    Current Inventory List:
    ${inventoryContext}

    Instructions:
    1. Be concise and friendly.
    2. Tell the user EXACTLY where the item is based on the "Location" field.
    3. If the item isn't in the list, suggest they might have misplaced it or haven't added it yet.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: { systemInstruction },
  });

  return response.text;
};
