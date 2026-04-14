import { describe, it, expect } from "vitest";
import { calculateCreativeScores } from "./creativeScoring";

describe("Creative Scoring System", () => {
  it("deve calcular scores para um criativo básico", () => {
    const text = "Você está cansado de perder dinheiro? Clique aqui agora!";
    const segments = [
      { id: 1, start: 0, end: 3, text: "Você está cansado de perder dinheiro?", speaker: "narrator" },
      { id: 2, start: 3, end: 6, text: "Clique aqui agora!", speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.score_geral).toBeGreaterThan(0);
    expect(result.score_geral).toBeLessThanOrEqual(10);
    expect(result.hook_power).toBeGreaterThan(0);
    expect(result.cta_strength).toBeGreaterThan(0);
    expect(result.detalhes).toBeDefined();
  });

  it("deve detectar hook power quando há palavras-chave de impacto", () => {
    const text = "Descobrir o segredo que mudará sua vida para sempre!";
    const segments = [
      { id: 1, start: 0, end: 3, text: text, speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.hook_power).toBeGreaterThan(5);
  });

  it("deve detectar CTA strength quando há verbos de ação", () => {
    const text = "Compre agora mesmo! Não perca esta oportunidade.";
    const segments = [
      { id: 1, start: 0, end: 5, text: text, speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.cta_strength).toBeGreaterThan(6);
  });

  it("deve detectar intensidade emocional com palavras emocionais", () => {
    const text = "Tenho medo de falhar! Mas há esperança! Você consegue!";
    const segments = [
      { id: 1, start: 0, end: 10, text: text, speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.intensidade_emocional).toBeGreaterThan(5);
  });

  it("deve detectar especificidade com números e dados", () => {
    const text = "87% dos usuários economizaram 50% em 30 dias. Para mulheres empreendedoras.";
    const segments = [
      { id: 1, start: 0, end: 10, text: text, speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.especificidade).toBeGreaterThan(6);
  });

  it("deve penalizar criativos sem CTA claro", () => {
    const text = "Este é um produto muito bom e você deveria considerar usar.";
    const segments = [
      { id: 1, start: 0, end: 10, text: text, speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.cta_strength).toBeLessThan(5);
  });

  it("deve calcular retenção baseado na estrutura", () => {
    const text = "Hook: Você quer ganhar dinheiro? Problema: Está sem tempo. Solução: Use nosso app. Prova: 10k usuários felizes. CTA: Baixe agora!";
    const segments = [
      { id: 1, start: 0, end: 10, text: "Hook: Você quer ganhar dinheiro?", speaker: "narrator" },
      { id: 2, start: 10, end: 20, text: "Problema: Está sem tempo.", speaker: "narrator" },
      { id: 3, start: 20, end: 30, text: "Solução: Use nosso app.", speaker: "narrator" },
      { id: 4, start: 30, end: 40, text: "Prova: 10k usuários felizes.", speaker: "narrator" },
      { id: 5, start: 40, end: 50, text: "CTA: Baixe agora!", speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.retencao_estimada).toBeGreaterThan(6);
  });

  it("deve retornar detalhes explicativos para cada score", () => {
    const text = "Clique agora para descobrir o segredo!";
    const segments = [
      { id: 1, start: 0, end: 5, text: text, speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.detalhes.hook_power_motivo).toBeDefined();
    expect(result.detalhes.clareza_mensagem_motivo).toBeDefined();
    expect(result.detalhes.intensidade_emocional_motivo).toBeDefined();
    expect(result.detalhes.especificidade_motivo).toBeDefined();
    expect(result.detalhes.cta_strength_motivo).toBeDefined();
    expect(result.detalhes.retencao_estimada_motivo).toBeDefined();
  });

  it("deve manter scores entre 1 e 10", () => {
    const text = "A" + "b".repeat(1000); // Texto muito longo
    const segments = [
      { id: 1, start: 0, end: 120, text: text, speaker: "narrator" },
    ];

    const result = calculateCreativeScores(text, segments);

    expect(result.hook_power).toBeGreaterThanOrEqual(1);
    expect(result.hook_power).toBeLessThanOrEqual(10);
    expect(result.score_geral).toBeGreaterThanOrEqual(1);
    expect(result.score_geral).toBeLessThanOrEqual(10);
  });
});
