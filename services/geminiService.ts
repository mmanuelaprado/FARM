
import { GoogleGenAI } from "@google/genai";

// Função para obter a chave de forma segura
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "O tempo está ótimo para colher!";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um mentor especialista em fazendas no jogo "Gemini Harvest". 
    O jogador está no nível ${level}, tem ${coins} moedas e o seguinte inventário: ${JSON.stringify(inventory)}.
    Dê uma dica curta e motivadora (máximo 15 palavras) sobre o que plantar ou como economizar.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Continue plantando para crescer!";
  } catch (error) {
    console.error("Gemini advice error:", error);
    return "Mantenha o foco na sua produção!";
  }
};
