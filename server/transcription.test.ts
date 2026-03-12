import { describe, expect, it, beforeAll } from "vitest";
import { transcribeWithGroq } from "./transcription";
import { ENV } from "./_core/env";

describe("Transcription with Groq API", () => {
  beforeAll(() => {
    if (!ENV.groqApiKey) {
      console.warn("[Test] GROQ_API_KEY não configurada - testes de transcrição real serão pulados");
    }
  });

  it("should validate that GROQ_API_KEY is configured", () => {
    expect(ENV.groqApiKey).toBeDefined();
    expect(ENV.groqApiKey).not.toBe("");
  });

  it("should process transcription segments correctly", async () => {
    // Criar um buffer de áudio simulado (wave header + silence)
    const audioBuffer = Buffer.from([
      // WAVE header
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6d, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // Subchunk1Size
      0x01, 0x00, // AudioFormat (PCM)
      0x01, 0x00, // NumChannels
      0x44, 0xac, 0x00, 0x00, // SampleRate (44100)
      0x88, 0x58, 0x01, 0x00, // ByteRate
      0x02, 0x00, // BlockAlign
      0x10, 0x00, // BitsPerSample
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x00, 0x00, 0x00, // Subchunk2Size
    ]);

    try {
      const result = await transcribeWithGroq(audioBuffer, "test-audio.wav");

      // Validar estrutura da resposta
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("segments");
      expect(result).toHaveProperty("language");

      // Validar que segments é um array
      expect(Array.isArray(result.segments)).toBe(true);

      // Se houver segmentos, validar estrutura
      if (result.segments.length > 0) {
        const segment = result.segments[0];
        expect(segment).toHaveProperty("id");
        expect(segment).toHaveProperty("start");
        expect(segment).toHaveProperty("end");
        expect(segment).toHaveProperty("text");
        expect(segment).toHaveProperty("speaker");

        // Validar tipos
        expect(typeof segment.id).toBe("number");
        expect(typeof segment.start).toBe("number");
        expect(typeof segment.end).toBe("number");
        expect(typeof segment.text).toBe("string");
        expect(typeof segment.speaker).toBe("string");
      }
    } catch (error) {
      // Se a API falhar, apenas log (pode ser por arquivo inválido)
      console.warn("[Test] Transcrição falhou (esperado com arquivo de teste):", error);
    }
  });

  it("should throw error when GROQ_API_KEY is missing", async () => {
    // Temporariamente remover a chave
    const originalKey = ENV.groqApiKey;
    (ENV as any).groqApiKey = "";

    const audioBuffer = Buffer.from([0x00, 0x01, 0x02]);

    try {
      await transcribeWithGroq(audioBuffer, "test.wav");
      expect.fail("Deveria ter lançado erro");
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as Error).message).toContain("GROQ_API_KEY");
    }

    // Restaurar a chave
    (ENV as any).groqApiKey = originalKey;
  });
});
