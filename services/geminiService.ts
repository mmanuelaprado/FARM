
import { GoogleGenAI } from "@google/genai";

/**
 * Obtém a chave de API de forma segura.
 * No navegador (Vercel Client-side), 'process' não existe.
 * Acessar process.env diretamente causa ReferenceError e quebra a aplicação (Tela Branca).
 */
const getSafeApiKey = (): string => {
  try {
    // Usamos uma verificação de tipo para evitar ReferenceError
    // @ts-ignore
    const env = typeof process !== 'undefined' ? process.env : (window as any).process?.env;
    if (env && env.API_KEY) {
      return env.API_KEY;
    }
  } catch (e) {
    console.warn("Ambiente de variáveis não detectado.");
  }
  return "";
};

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
    return "O tempo está ótimo para cultivar! Continue o bom trabalho.";
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
    return "Mantenha o foco na sua produção e colha bons frutos!";
  }
};
