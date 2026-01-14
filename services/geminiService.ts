
import { GoogleGenAI } from "@google/genai";

/**
 * Tenta obter a chave de API de forma segura sem quebrar o ambiente do navegador.
 * No Vercel/ESM puro, process.env pode causar ReferenceError.
 */
const getSafeApiKey = (): string => {
  try {
    // Verifica se process existe no escopo global de forma segura
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Silencia erros de referência
  }
  return "";
};

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    return "O tempo está ótimo para colher hoje! Continue cuidando da sua fazenda.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um mentor especialista em fazendas no jogo "Gemini Harvest". 
    O jogador está no nível ${level}, tem ${coins} moedas e o seguinte inventário: ${JSON.stringify(inventory)}.
    Dê uma dica curta e motivadora (máximo 12 palavras) sobre o que plantar ou como economizar.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || "Continue plantando para crescer!";
  } catch (error) {
    console.error("Gemini advice error:", error);
    return "Mantenha o foco na sua produção e colha bons frutos!";
  }
};
