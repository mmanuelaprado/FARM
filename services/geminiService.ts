
import { GoogleGenAI } from "@google/genai";

const FALLBACK_ADVICE = [
  "O sol está radiante hoje! Perfeito para cuidar da terra.",
  "Lembre-se de regar suas plantas para colher mais rápido!",
  "A Fruta do Dragão é o tesouro dos fazendeiros de nível 10.",
  "Diversificar sua colheita é o segredo para um bolso cheio.",
  "Sua fazenda é o lugar mais bonito da região hoje!",
  "Galinhas produzem ovos mais rápido se você estiver por perto!",
  "Economize moedas para expandir seu terreno em breve."
];

let lastCallTime = 0;
const THROTTLE_MS = 300000; // 5 minutos de intervalo para chamadas à API

export const getFarmAdvice = async (coins: number, level: number, inventory: any) => {
  const now = Date.now();
  
  // Tenta recuperar do cache se a última chamada foi recente
  const cachedAdvice = localStorage.getItem('gemini_advice_cache');
  const cachedTime = Number(localStorage.getItem('gemini_advice_time') || 0);

  if (now - cachedTime < THROTTLE_MS && cachedAdvice) {
    return cachedAdvice;
  }

  const apiKey = (import.meta as any).env?.API_KEY || (process as any).env?.API_KEY || "";
  
  // Se não houver chave ou for muito cedo para chamar a API novamente, usa fallback
  if (!apiKey || (now - lastCallTime < THROTTLE_MS)) {
    const randomFallback = FALLBACK_ADVICE[Math.floor(Math.random() * FALLBACK_ADVICE.length)];
    return randomFallback;
  }

  try {
    lastCallTime = now;
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um mentor especialista em fazendas. 
    Status: Nível ${level}, Moedas ${coins}.
    Inventário: ${JSON.stringify(inventory)}.
    Dê uma dica curta e motivadora (máximo 10 palavras).`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    const adviceText = response.text?.trim() || FALLBACK_ADVICE[0];
    
    // Salva no cache
    localStorage.setItem('gemini_advice_cache', adviceText);
    localStorage.setItem('gemini_advice_time', now.toString());
    
    return adviceText;
  } catch (error: any) {
    console.warn("Gemini API Error (Quota/Network):", error?.message || "Erro desconhecido");
    // Retorna dica aleatória em caso de erro 429 ou outros
    return FALLBACK_ADVICE[Math.floor(Math.random() * FALLBACK_ADVICE.length)];
  }
};
