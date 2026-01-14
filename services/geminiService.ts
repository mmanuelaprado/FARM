
import { GoogleGenAI } from "@google/genai";

// Initialize with a named parameter as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  try {
    const prompt = `Você é um mentor especialista em fazendas no jogo "Gemini Harvest". 
    O jogador está no nível ${level}, tem ${coins} moedas e o seguinte inventário: ${JSON.stringify(inventory)}.
    Dê uma dica curta e motivadora (máximo 15 palavras) sobre o que plantar ou como economizar.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // Accessing .text property directly (not a method) as per guidelines
    return response.text || "Continue plantando para crescer!";
  } catch (error) {
    console.error("Gemini advice error:", error);
    return "O tempo está ótimo para colher!";
  }
};
