
import { GoogleGenAI } from "@google/genai";

// No Vercel/Browser sem bundler, process.env pode não estar definido.
// Usamos uma verificação segura para evitar o erro "process is not defined".
const getSafeApiKey = (): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Ambiente de process.env não disponível.");
  }
  return "";
};

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    return "O tempo está ótimo para colher hoje!";
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
    return "Mantenha o foco na sua produção!";
  }
};
