
import { GoogleGenAI } from "@google/genai";

/**
 * Tenta obter a chave de API de forma segura.
 * No Vercel Browser, process.env.API_KEY pode resultar em erro de referência.
 */
const getSafeApiKey = (): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    // Silencia o erro para evitar que a aplicação pare
  }
  return "";
};

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    return "Sua fazenda está linda hoje! Continue cultivando.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um mentor especialista em fazendas no jogo "Gemini Harvest". 
    O jogador está no nível ${level}, tem ${coins} moedas e o seguinte inventário: ${JSON.stringify(inventory)}.
    Dê uma dica curta e motivadora (máximo 12 palavras).`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || "Plante mais para ganhar mais XP!";
  } catch (error) {
    console.error("Gemini advice error:", error);
    return "O dia está ótimo para trabalhar na terra!";
  }
};
