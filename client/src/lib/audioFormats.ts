/**
 * Formatos de áudio e vídeo suportados
 */

export const SUPPORTED_AUDIO_FORMATS = [
  // Formatos de áudio comuns
  "mp3",    // MPEG-3 Audio
  "wav",    // Waveform Audio
  "m4a",    // MPEG-4 Audio
  "aac",    // Advanced Audio Coding
  "ogg",    // Ogg Vorbis
  "opus",   // Opus Audio
  "flac",   // Free Lossless Audio Codec
  "wma",    // Windows Media Audio
  "alac",   // Apple Lossless Audio Codec
  "ape",    // Monkey's Audio
];

export const SUPPORTED_VIDEO_FORMATS = [
  // Formatos de vídeo comuns
  "mp4",    // MPEG-4 Video
  "mov",    // QuickTime Movie
  "avi",    // Audio Video Interleave
  "mkv",    // Matroska Video
  "flv",    // Flash Video
  "wmv",    // Windows Media Video
  "webm",   // WebM Video
  "m4v",    // MPEG-4 Video (iTunes)
  "3gp",    // 3GPP Video
  "ogv",    // Ogg Video
  "ts",     // MPEG Transport Stream
  "mts",    // MPEG Transport Stream
  "m2ts",   // Blu-ray MPEG Transport Stream
];

export const ALL_SUPPORTED_FORMATS = [...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS];

export const SUPPORTED_MIME_TYPES = [
  // Áudio
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
  "audio/flac",
  "audio/x-flac",
  "audio/x-ms-wma",
  "audio/x-apple-protected-mpeg4-audio",
  "audio/x-ape",
  
  // Vídeo
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-flv",
  "video/x-ms-wmv",
  "video/webm",
  "video/3gpp",
  "video/ogg",
  "video/mp2t",
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_DURATION = 2 * 60 * 60; // 2 horas em segundos

export function getFormatType(filename: string): "audio" | "video" | "unknown" {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  
  if (SUPPORTED_AUDIO_FORMATS.includes(extension)) {
    return "audio";
  }
  if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
    return "video";
  }
  return "unknown";
}

export function isFormatSupported(filename: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return ALL_SUPPORTED_FORMATS.includes(extension);
}

export function formatSizeInMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}
