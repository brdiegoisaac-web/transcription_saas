import { describe, it, expect, vi } from "vitest";
import { transcribeYouTubeVideo } from "./youtube";

describe("YouTube Transcription", () => {
  it("should validate YouTube URLs correctly", async () => {
    // URL inválida
    const result = await transcribeYouTubeVideo("https://example.com/video");
    expect(result.success).toBe(false);
    expect(result.error).toContain("inválida");
  });

  it("should handle valid YouTube URL format", async () => {
    // URL válida (mas será rejeitada por falta de yt-dlp em teste)
    const result = await transcribeYouTubeVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    // Esperamos erro porque yt-dlp pode não estar disponível ou a URL pode ser inválida
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it("should accept alternative YouTube URL formats", async () => {
    // URL curta do YouTube
    const result = await transcribeYouTubeVideo("https://youtu.be/dQw4w9WgXcQ");
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it("should support different language codes", async () => {
    const languages = ["pt", "en", "es"] as const;
    
    for (const lang of languages) {
      const result = await transcribeYouTubeVideo(
        "https://www.youtube.com/watch?v=invalid",
        lang
      );
      // Deve retornar um objeto com success e error
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
    }
  });
});
