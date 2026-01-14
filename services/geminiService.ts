
/**
 * DATABASE DE CONSELHOS LOCAIS - 100% OFFLINE
 */
const FARM_ADVICE_DATABASE = [
  "O sol está radiante hoje! Perfeito para cuidar da terra.",
  "Lembre-se de regar suas plantas para colher 2x mais rápido!",
  "A Fruta do Dragão é o tesouro dos fazendeiros de nível 10.",
  "Diversificar sua colheita é o segredo para um bolso cheio.",
  "Sua fazenda é o lugar mais bonito da região hoje!",
  "Galinhas produzem ovos mais rápido se você estiver por perto!",
  "Economize moedas para expandir seu terreno clicando nos lotes bloqueados.",
  "O Trigo é ótimo para começar, mas o Milho dá mais lucro.",
  "Já pensou em adotar uma vaca? O leite vale muito no mercado.",
  "Nível 5 desbloqueia sementes muito mais valiosas!",
  "Vender produtos animais é a forma mais rápida de ficar rico.",
  "Cada colheita te deixa mais perto de ser um mestre fazendeiro."
];

/**
 * Retorna um conselho local baseado no progresso real do jogador.
 * Substitui o modelo de IA por lógica de programação clássica.
 */
export const getFarmAdvice = async (coins: number, level: number, inventory: any): Promise<string> => {
  // Lógica contextual estática
  if (level === 1 && coins < 10) {
    return "Dica inicial: Comece plantando Trigo para ganhar suas primeiras moedas!";
  }
  
  if (level >= 10 && (!inventory || !inventory["Fruta Dragão"])) {
    return "Status de Mestre: Você já pode cultivar a lendária Fruta Dragão!";
  }

  // Fallback aleatório seguro
  const randomIndex = Math.floor(Math.random() * FARM_ADVICE_DATABASE.length);
  return FARM_ADVICE_DATABASE[randomIndex];
};
