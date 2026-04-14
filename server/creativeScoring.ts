/**
 * Sistema de Scoring Objetivo para Análise de Criativos
 * 
 * Este módulo calcula scores baseados em regras claras e mensuráveis.
 * Os scores são SUGESTÕES baseadas em análise técnica, não verdades absolutas.
 */

interface ScoringResult {
  hook_power: number;
  clareza_mensagem: number;
  intensidade_emocional: number;
  especificidade: number;
  cta_strength: number;
  retencao_estimada: number;
  score_geral: number;
  detalhes: {
    hook_power_motivo: string;
    clareza_mensagem_motivo: string;
    intensidade_emocional_motivo: string;
    especificidade_motivo: string;
    cta_strength_motivo: string;
    retencao_estimada_motivo: string;
  };
}

// Palavras-chave para detectar características
const HOOK_KEYWORDS = [
  "você", "descobrir", "nunca", "espera", "problema", "solução",
  "segredo", "revelação", "choque", "curiosidade", "atenção",
  "espere", "pare", "veja", "olha", "imagine", "pense"
];

const EMOTIONAL_KEYWORDS = {
  medo: ["medo", "perigo", "risco", "fracasso", "perder", "problema", "dor", "sofrimento"],
  esperança: ["esperança", "possível", "conseguir", "sucesso", "ganhar", "feliz", "melhor"],
  urgência: ["agora", "hoje", "rápido", "urgente", "limite", "final", "último", "antes"],
  curiosidade: ["descobrir", "segredo", "revelação", "novo", "incrível", "surpreendente"],
  raiva: ["injustiça", "raiva", "indignado", "absurdo", "ridículo"],
};

const CTA_VERBS = [
  "clique", "compre", "assista", "inscreva", "baixe", "acesse",
  "confira", "aprenda", "descubra", "comece", "experimente",
  "reserve", "registre", "cadastre", "solicite", "compartilhe"
];

/**
 * Calcula o score de Hook Power (0-10)
 * Baseado em: presença de palavras-chave de impacto, posição no início, comprimento
 */
function calculateHookPower(text: string, segments: any[]): { score: number; motivo: string } {
  let score = 5; // Base neutra

  // Verificar se começa nos primeiros 3 segundos
  const firstSegment = segments?.[0];
  if (firstSegment && firstSegment.end <= 3) {
    score += 1.5;
  }

  // Contar palavras-chave de hook
  const lowerText = text.toLowerCase();
  const hookKeywordCount = HOOK_KEYWORDS.filter(kw => lowerText.includes(kw)).length;
  score += Math.min(hookKeywordCount * 0.5, 2);

  // Verificar comprimento (muito curto é melhor para hook)
  const firstSentence = text.split(/[.!?]/)[0];
  if (firstSentence.length < 50) {
    score += 1;
  } else if (firstSentence.length > 150) {
    score -= 1;
  }

  // Verificar presença de números ou dados
  if (/\d+/.test(text)) {
    score += 0.5;
  }

  score = Math.min(Math.max(score, 1), 10);
  const motivo = `Hook detectado com ${hookKeywordCount} palavras-chave de impacto. ${firstSegment?.end <= 3 ? "Posicionado nos primeiros 3s (ótimo)." : "Posicionado depois dos 3s iniciais."}`;

  return { score: Math.round(score * 10) / 10, motivo };
}

/**
 * Calcula o score de Clareza da Mensagem (0-10)
 * Baseado em: comprimento médio das frases, simplicidade, repetição de mensagem
 */
function calculateClareza(text: string): { score: number; motivo: string } {
  let score = 5;

  // Dividir em frases
  const frases = text.split(/[.!?]+/).filter(f => f.trim().length > 0);
  const comprimentoMedio = text.split(" ").length / frases.length;

  // Frases muito longas reduzem clareza
  if (comprimentoMedio < 10) {
    score += 2; // Frases curtas = clara
  } else if (comprimentoMedio < 15) {
    score += 1;
  } else if (comprimentoMedio > 25) {
    score -= 1.5; // Frases muito longas = confusa
  }

  // Verificar uso de jargão técnico (reduz clareza para público geral)
  const jargaoTecnico = (text.match(/\b(algoritmo|API|framework|database|blockchain|NFT)\b/gi) || []).length;
  if (jargaoTecnico > 2) {
    score -= 1;
  }

  // Verificar repetição de mensagem principal (bom sinal)
  const palavrasPrincipais = text.split(" ").filter(p => p.length > 5);
  const frequencia = new Map();
  palavrasPrincipais.forEach(p => {
    frequencia.set(p.toLowerCase(), (frequencia.get(p.toLowerCase()) || 0) + 1);
  });
  const repeticoes = Array.from(frequencia.values()).filter(v => v > 2).length;
  if (repeticoes > 0) {
    score += 0.5;
  }

  score = Math.min(Math.max(score, 1), 10);
  const motivo = `Comprimento médio das frases: ${comprimentoMedio.toFixed(1)} palavras. ${jargaoTecnico > 0 ? `${jargaoTecnico} termos técnicos detectados.` : "Linguagem acessível."}`;

  return { score: Math.round(score * 10) / 10, motivo };
}

/**
 * Calcula o score de Intensidade Emocional (0-10)
 * Baseado em: detecção de palavras emocionais, pontuação, maiúsculas
 */
function calculateIntensidadeEmocional(text: string): { score: number; motivo: string } {
  let score = 5;
  let emocoesDetectadas: string[] = [];

  const lowerText = text.toLowerCase();

  // Contar palavras emocionais por categoria
  for (const [emocao, palavras] of Object.entries(EMOTIONAL_KEYWORDS)) {
    const count = palavras.filter(p => lowerText.includes(p)).length;
    if (count > 0) {
      score += Math.min(count * 0.8, 2);
      emocoesDetectadas.push(`${emocao} (${count})`);
    }
  }

  // Verificar pontuação (! e ? aumentam intensidade)
  const exclamacoes = (text.match(/!/g) || []).length;
  const interrogacoes = (text.match(/\?/g) || []).length;
  score += Math.min((exclamacoes + interrogacoes) * 0.3, 1.5);

  // Verificar MAIÚSCULAS (ênfase)
  const maiusculas = (text.match(/[A-Z]/g) || []).length;
  if (maiusculas > text.length * 0.15) {
    score += 0.5;
  }

  score = Math.min(Math.max(score, 1), 10);
  const motivo = `Emoções detectadas: ${emocoesDetectadas.join(", ") || "nenhuma"}. Pontuação: ${exclamacoes} ! e ${interrogacoes} ?`;

  return { score: Math.round(score * 10) / 10, motivo };
}

/**
 * Calcula o score de Especificidade (0-10)
 * Baseado em: números, dados, público específico, casos de uso
 */
function calculateEspecificidade(text: string): { score: number; motivo: string } {
  let score = 5;
  let indicadores: string[] = [];

  // Números e dados
  const numeros = (text.match(/\d+/g) || []).length;
  if (numeros > 0) {
    score += Math.min(numeros * 0.5, 2);
    indicadores.push(`${numeros} números/dados`);
  }

  // Menção de público específico
  const publicos = ["mulheres", "homens", "jovens", "pais", "empreendedores", "profissionais", "mães", "pais", "executivos"];
  const publicoCount = publicos.filter(p => text.toLowerCase().includes(p)).length;
  if (publicoCount > 0) {
    score += 1.5;
    indicadores.push("público específico");
  }

  // Menção de casos de uso
  const usosComuns = ["para", "quando", "se você", "se você quer", "se você precisa"];
  const usoCount = usosComuns.filter(u => text.toLowerCase().includes(u)).length;
  if (usoCount > 0) {
    score += 1;
    indicadores.push("casos de uso");
  }

  // Percentuais ou comparações
  if (/%|mais|menos|versus|vs/.test(text)) {
    score += 0.5;
    indicadores.push("comparações");
  }

  score = Math.min(Math.max(score, 1), 10);
  const motivo = `Indicadores de especificidade: ${indicadores.join(", ") || "genérico"}`;

  return { score: Math.round(score * 10) / 10, motivo };
}

/**
 * Calcula o score de Força do CTA (0-10)
 * Baseado em: presença de verbo de ação, clareza, urgência
 */
function calculateCtaStrength(text: string, segments: any[]): { score: number; motivo: string } {
  let score = 5;

  // Verificar se tem CTA nos últimos 10% do texto
  const lastSegments = segments?.slice(-Math.ceil(segments.length * 0.1)) || [];
  const lastText = lastSegments.map((s: any) => s.text).join(" ").toLowerCase();

  // Contar verbos de CTA
  const ctaVerbCount = CTA_VERBS.filter(v => lastText.includes(v)).length;
  if (ctaVerbCount > 0) {
    score += 2;
  } else if (text.toLowerCase().includes("clique") || text.toLowerCase().includes("compre")) {
    score += 1;
  } else {
    score -= 1.5; // Sem CTA claro
  }

  // Verificar urgência no CTA
  if (lastText.includes("agora") || lastText.includes("hoje") || lastText.includes("rápido")) {
    score += 1.5;
  }

  // Verificar comprimento do CTA (deve ser curto)
  if (lastText.length < 30) {
    score += 0.5;
  }

  score = Math.min(Math.max(score, 1), 10);
  const motivo = `${ctaVerbCount} verbos de ação detectados. ${lastText.includes("agora") ? "Com urgência." : "Sem urgência."}`;

  return { score: Math.round(score * 10) / 10, motivo };
}

/**
 * Calcula o score de Retenção Estimada (0-10)
 * Baseado em: estrutura completa, variedade de elementos, comprimento
 */
function calculateRetencao(text: string, segments: any[]): { score: number; motivo: string } {
  let score = 5;
  const blocos = ["hook", "problema", "solução", "cta", "prova", "insight"];
  const blocosPresentes = blocos.filter(b => text.toLowerCase().includes(b)).length;

  // Estrutura completa
  score += (blocosPresentes / blocos.length) * 2;

  // Comprimento ideal (30-60 segundos é bom)
  const duracao = segments?.[segments.length - 1]?.end || 0;
  if (duracao >= 30 && duracao <= 60) {
    score += 1.5;
  } else if (duracao < 15) {
    score -= 1; // Muito curto
  } else if (duracao > 120) {
    score -= 1; // Muito longo
  }

  // Variedade de pontuação (indica ritmo)
  const pontuacao = (text.match(/[.!?]/g) || []).length;
  const frasesMedia = pontuacao / (text.split(" ").length / 10);
  if (frasesMedia > 0.5 && frasesMedia < 2) {
    score += 1;
  }

  score = Math.min(Math.max(score, 1), 10);
  const motivo = `Estrutura: ${blocosPresentes}/${blocos.length} blocos. Duração: ${duracao.toFixed(0)}s. ${duracao >= 30 && duracao <= 60 ? "Ideal." : "Fora do ideal."}`;

  return { score: Math.round(score * 10) / 10, motivo };
}

/**
 * Calcula todos os scores
 */
export function calculateCreativeScores(text: string, segments: any[] = []): ScoringResult {
  const hookPower = calculateHookPower(text, segments);
  const clareza = calculateClareza(text);
  const intensidade = calculateIntensidadeEmocional(text);
  const especificidade = calculateEspecificidade(text);
  const ctaStrength = calculateCtaStrength(text, segments);
  const retencao = calculateRetencao(text, segments);

  // Score geral é a média
  const scoreGeral = Math.round(
    ((hookPower.score + clareza.score + intensidade.score + especificidade.score + ctaStrength.score + retencao.score) / 6) * 10
  ) / 10;

  return {
    hook_power: hookPower.score,
    clareza_mensagem: clareza.score,
    intensidade_emocional: intensidade.score,
    especificidade: especificidade.score,
    cta_strength: ctaStrength.score,
    retencao_estimada: retencao.score,
    score_geral: scoreGeral,
    detalhes: {
      hook_power_motivo: hookPower.motivo,
      clareza_mensagem_motivo: clareza.motivo,
      intensidade_emocional_motivo: intensidade.motivo,
      especificidade_motivo: especificidade.motivo,
      cta_strength_motivo: ctaStrength.motivo,
      retencao_estimada_motivo: retencao.motivo,
    },
  };
}
