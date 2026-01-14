
/**
 * DATABASE DE CONSELHOS LOCAIS (Substitui a IA)
 * Mantém o mesmo comportamento de prover dicas ao jogador de forma estática.
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
  "A terra está úmida e fértil hoje, aproveite!",
  "Já pensou em adotar uma vaca? O leite vale muito no mercado.",
  "A organização dos canteiros facilita a colheita rápida.",
  "Nível 5 desbloqueia sementes muito mais valiosas!",
  "Mantenha sempre sementes no estoque para não perder tempo.",
  "Vender produtos animais é a forma mais rápida de ficar rico.",
  "Cada colheita te deixa mais perto de ser um mestre fazendeiro."
];

/**
 * Retorna um conselho da base local com base no contexto do jogador.
 * Esta função mantém o nome original para não quebrar a lógica do App.tsx,
 * mas remove toda e qualquer chamada para modelos de linguagem ou APIs externas.
 */
export const getFarmAdvice = async (coins: number, level: number, inventory: any): Promise<string> => {
  // Lógica contextual simples para substituir o "raciocínio" da IA
  if (level === 1 && coins < 10) {
    return "Dica: Plante Trigo para começar a girar sua economia!";
  }

  if (level >= 10 && (!inventory || !inventory["Fruta Dragão"])) {
    return "Incrível! Você já pode plantar Fruta Dragão, o item mais valioso!";
  }

  if (coins > 1000 && level < 5) {
    return "Você tem muitas moedas! Que tal focar em XP para subir de nível?";
  }

  // Seleção aleatória para dicas gerais
  const randomIndex = Math.floor(Math.random() * FARM_ADVICE_DATABASE.length);
  return FARM_ADVICE_DATABASE[randomIndex];
};
