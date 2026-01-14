
import { GoogleGenAI } from "@google/genai";

// Inicialização segura: se a chave não existir, o serviço falhará graciosamente
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  const ai = getAIClient();
  if (!ai) return "O tempo está ótimo para colher!";

  try {
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
