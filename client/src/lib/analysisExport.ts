/**
 * Funções para exportar análise de criativo em diferentes formatos
 */

interface BlocoEstrutura {
  bloco: string;
  texto: string;
  timestamp_inicio: string;
  timestamp_fim: string;
  score: number;
  tipo: string;
  observacao: string;
}

interface EngenhariaReversa {
  big_idea: string;
  mecanismo_unico: string;
  emocao_principal: string;
  emocoes_secundarias: string[];
  publico_alvo_implicito: string;
  nivel_consciencia: string;
  angulo_principal: string;
}

interface Scores {
  hook_power: number;
  clareza_mensagem: number;
  intensidade_emocional: number;
  especificidade: number;
  cta_strength: number;
  retencao_estimada: number;
  score_geral: number;
}

interface Melhoria {
  bloco: string;
  problema: string;
  sugestao: string;
  exemplo: string;
}

interface AnalysisData {
  estrutura: BlocoEstrutura[];
  engenharia_reversa: EngenhariaReversa;
  scores: Scores;
  melhorias: Melhoria[];
  veredicto: string;
}

/**
 * Gera texto formatado da análise para copiar
 */
export function generateFormattedAnalysisText(analysis: AnalysisData): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("ANÁLISE DE CRIATIVO - IA");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  // Score Geral
  lines.push("📊 SCORE GERAL");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`${analysis.scores?.score_geral || 0}/10`);
  lines.push("");

  // Scores Detalhados
  lines.push("📈 SCORES DETALHADOS");
  lines.push("───────────────────────────────────────────────────────────────");
  if (analysis.scores) {
    lines.push(`• Hook Power: ${analysis.scores.hook_power}/10`);
    lines.push(`• Clareza da Mensagem: ${analysis.scores.clareza_mensagem}/10`);
    lines.push(`• Intensidade Emocional: ${analysis.scores.intensidade_emocional}/10`);
    lines.push(`• Especificidade: ${analysis.scores.especificidade}/10`);
    lines.push(`• Força do CTA: ${analysis.scores.cta_strength}/10`);
    lines.push(`• Retenção Estimada: ${analysis.scores.retencao_estimada}/10`);
  }
  lines.push("");

  // Estrutura
  lines.push("🏗️  ESTRUTURA DO CRIATIVO");
  lines.push("───────────────────────────────────────────────────────────────");
  if (analysis.estrutura && analysis.estrutura.length > 0) {
    analysis.estrutura.forEach((bloco, idx) => {
      lines.push(`\n${idx + 1}. ${bloco.bloco.toUpperCase()}`);
      lines.push(`   Timestamp: ${bloco.timestamp_inicio} → ${bloco.timestamp_fim}`);
      lines.push(`   Score: ${bloco.score}/10`);
      lines.push(`   Tipo: ${bloco.tipo}`);
      lines.push(`   Texto: "${bloco.texto}"`);
      lines.push(`   Observação: ${bloco.observacao}`);
    });
  }
  lines.push("");

  // Engenharia Reversa
  lines.push("🔍 ENGENHARIA REVERSA");
  lines.push("───────────────────────────────────────────────────────────────");
  if (analysis.engenharia_reversa) {
    lines.push(`Big Idea: ${analysis.engenharia_reversa.big_idea}`);
    lines.push(`Mecanismo Único: ${analysis.engenharia_reversa.mecanismo_unico}`);
    lines.push(`Emoção Principal: ${analysis.engenharia_reversa.emocao_principal}`);
    if (analysis.engenharia_reversa.emocoes_secundarias?.length) {
      lines.push(`Emoções Secundárias: ${analysis.engenharia_reversa.emocoes_secundarias.join(", ")}`);
    }
    lines.push(`Público-Alvo Implícito: ${analysis.engenharia_reversa.publico_alvo_implicito}`);
    lines.push(`Nível de Consciência: ${analysis.engenharia_reversa.nivel_consciencia}`);
    lines.push(`Ângulo Principal: ${analysis.engenharia_reversa.angulo_principal}`);
  }
  lines.push("");

  // Melhorias
  lines.push("💡 SUGESTÕES DE MELHORIA");
  lines.push("───────────────────────────────────────────────────────────────");
  if (analysis.melhorias && analysis.melhorias.length > 0) {
    analysis.melhorias.forEach((melhoria, idx) => {
      lines.push(`\n${idx + 1}. ${melhoria.bloco.toUpperCase()}`);
      lines.push(`   ❌ Problema: ${melhoria.problema}`);
      lines.push(`   ✅ Sugestão: ${melhoria.sugestao}`);
      if (melhoria.exemplo) {
        lines.push(`   📝 Exemplo: "${melhoria.exemplo}"`);
      }
    });
  }
  lines.push("");

  // Veredicto
  if (analysis.veredicto) {
    lines.push("🎯 VEREDICTO");
    lines.push("───────────────────────────────────────────────────────────────");
    lines.push(analysis.veredicto);
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("Gerado automaticamente pela IA");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

/**
 * Gera PDF da análise usando jsPDF e html2canvas
 */
export async function generateAnalysisPDF(analysis: AnalysisData): Promise<Blob> {
  // Importar dinamicamente para evitar aumentar o bundle
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  // Criar um elemento temporário com o conteúdo formatado
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "210mm"; // A4 width
  container.style.padding = "20px";
  container.style.backgroundColor = "white";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.fontSize = "12px";
  container.style.lineHeight = "1.6";
  container.style.color = "#333";

  // Gerar HTML
  const html = generateAnalysisHTML(analysis);
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Converter para canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Criar PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL("image/png");

    // Adicionar páginas conforme necessário
    while (heightLeft >= 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      position -= pageHeight;
      if (heightLeft > 0) {
        pdf.addPage();
      }
    }

    // Obter blob
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Gera HTML formatado da análise
 */
function generateAnalysisHTML(analysis: AnalysisData): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h1 style="text-align: center; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px;">
        ANÁLISE DE CRIATIVO - IA
      </h1>

      <!-- Score Geral -->
      <div style="background-color: #f0f4ff; border-left: 4px solid #1e3a8a; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h2 style="color: #1e3a8a; margin-top: 0; font-size: 16px;">📊 SCORE GERAL</h2>
        <div style="font-size: 32px; font-weight: bold; color: #1e3a8a; text-align: center;">
          ${analysis.scores?.score_geral || 0}/10
        </div>
      </div>

      <!-- Scores Detalhados -->
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; font-size: 16px;">📈 SCORES DETALHADOS</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background-color: #f0f4ff;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Métrica</td>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: center;">Score</td>
        </tr>
        ${analysis.scores ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Hook Power</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${analysis.scores.hook_power}/10</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd;">Clareza da Mensagem</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${analysis.scores.clareza_mensagem}/10</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Intensidade Emocional</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${analysis.scores.intensidade_emocional}/10</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd;">Especificidade</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${analysis.scores.especificidade}/10</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Força do CTA</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${analysis.scores.cta_strength}/10</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd;">Retenção Estimada</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${analysis.scores.retencao_estimada}/10</td>
          </tr>
        ` : ''}
      </table>

      <!-- Estrutura -->
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; font-size: 16px; page-break-after: avoid;">🏗️  ESTRUTURA DO CRIATIVO</h2>
      ${analysis.estrutura && analysis.estrutura.length > 0 ? `
        <div style="margin-bottom: 20px;">
          ${analysis.estrutura.map((bloco, idx) => `
            <div style="background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin-bottom: 10px;">
              <h3 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 14px;">${idx + 1}. ${bloco.bloco.toUpperCase()}</h3>
              <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
                <strong>Timestamp:</strong> ${bloco.timestamp_inicio} → ${bloco.timestamp_fim} | 
                <strong>Score:</strong> ${bloco.score}/10 | 
                <strong>Tipo:</strong> ${bloco.tipo}
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Texto:</strong> <em>"${bloco.texto}"</em>
              </div>
              <div style="font-size: 11px; color: #666;">
                <strong>Observação:</strong> ${bloco.observacao}
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p>Nenhum bloco identificado.</p>'}

      <!-- Engenharia Reversa -->
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; font-size: 16px; page-break-after: avoid;">🔍 ENGENHARIA REVERSA</h2>
      ${analysis.engenharia_reversa ? `
        <div style="background-color: #f0f4ff; border-left: 4px solid #1e3a8a; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
          <p><strong>Big Idea:</strong> ${analysis.engenharia_reversa.big_idea}</p>
          <p><strong>Mecanismo Único:</strong> ${analysis.engenharia_reversa.mecanismo_unico}</p>
          <p><strong>Emoção Principal:</strong> ${analysis.engenharia_reversa.emocao_principal}</p>
          ${analysis.engenharia_reversa.emocoes_secundarias?.length ? `
            <p><strong>Emoções Secundárias:</strong> ${analysis.engenharia_reversa.emocoes_secundarias.join(", ")}</p>
          ` : ''}
          <p><strong>Público-Alvo Implícito:</strong> ${analysis.engenharia_reversa.publico_alvo_implicito}</p>
          <p><strong>Nível de Consciência:</strong> ${analysis.engenharia_reversa.nivel_consciencia}</p>
          <p><strong>Ângulo Principal:</strong> ${analysis.engenharia_reversa.angulo_principal}</p>
        </div>
      ` : ''}

      <!-- Melhorias -->
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; font-size: 16px; page-break-after: avoid;">💡 SUGESTÕES DE MELHORIA</h2>
      ${analysis.melhorias && analysis.melhorias.length > 0 ? `
        <div style="margin-bottom: 20px;">
          ${analysis.melhorias.map((melhoria, idx) => `
            <div style="background-color: #fff9f0; border: 1px solid #ffd699; border-radius: 4px; padding: 12px; margin-bottom: 10px;">
              <h3 style="margin: 0 0 8px 0; color: #d97706; font-size: 14px;">${idx + 1}. ${melhoria.bloco.toUpperCase()}</h3>
              <div style="margin-bottom: 8px;">
                <strong style="color: #dc2626;">❌ Problema:</strong> ${melhoria.problema}
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #16a34a;">✅ Sugestão:</strong> ${melhoria.sugestao}
              </div>
              ${melhoria.exemplo ? `
                <div style="background-color: #f0f9ff; border-left: 3px solid #0284c7; padding: 8px; font-style: italic; font-size: 11px;">
                  <strong>📝 Exemplo:</strong> "${melhoria.exemplo}"
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<p>Nenhuma melhoria identificada.</p>'}

      <!-- Veredicto -->
      ${analysis.veredicto ? `
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin-top: 20px; border-radius: 4px;">
          <h2 style="color: #16a34a; margin-top: 0; font-size: 16px;">🎯 VEREDICTO</h2>
          <p>${analysis.veredicto}</p>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #ddd; text-align: center; font-size: 10px; color: #999;">
        <p>Gerado automaticamente pela IA em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  `;
}
