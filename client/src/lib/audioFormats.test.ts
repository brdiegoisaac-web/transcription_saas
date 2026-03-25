import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  ALL_SUPPORTED_FORMATS,
  MAX_FILE_SIZE,
  MAX_DURATION,
  getFormatType,
  isFormatSupported,
  formatSizeInMB,
  formatDuration,
} from './audioFormats';

describe('Audio Formats', () => {
  it('should have audio formats defined', () => {
    expect(SUPPORTED_AUDIO_FORMATS).toContain('mp3');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('wav');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('m4a');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('aac');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('ogg');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('opus');
    expect(SUPPORTED_AUDIO_FORMATS).toContain('flac');
  });

  it('should have video formats defined', () => {
    expect(SUPPORTED_VIDEO_FORMATS).toContain('mp4');
    expect(SUPPORTED_VIDEO_FORMATS).toContain('mov');
    expect(SUPPORTED_VIDEO_FORMATS).toContain('avi');
    expect(SUPPORTED_VIDEO_FORMATS).toContain('mkv');
    expect(SUPPORTED_VIDEO_FORMATS).toContain('webm');
  });

  it('should combine all formats', () => {
    expect(ALL_SUPPORTED_FORMATS.length).toBe(
      SUPPORTED_AUDIO_FORMATS.length + SUPPORTED_VIDEO_FORMATS.length
    );
    expect(ALL_SUPPORTED_FORMATS).toContain('mp3');
    expect(ALL_SUPPORTED_FORMATS).toContain('mp4');
  });

  it('should detect format type correctly', () => {
    expect(getFormatType('audio.mp3')).toBe('audio');
    expect(getFormatType('audio.wav')).toBe('audio');
    expect(getFormatType('audio.flac')).toBe('audio');
    expect(getFormatType('video.mp4')).toBe('video');
    expect(getFormatType('video.mov')).toBe('video');
    expect(getFormatType('video.avi')).toBe('video');
    expect(getFormatType('file.unknown')).toBe('unknown');
    expect(getFormatType('file')).toBe('unknown');
  });

  it('should validate supported formats', () => {
    expect(isFormatSupported('audio.mp3')).toBe(true);
    expect(isFormatSupported('audio.wav')).toBe(true);
    expect(isFormatSupported('video.mp4')).toBe(true);
    expect(isFormatSupported('video.mov')).toBe(true);
    expect(isFormatSupported('file.txt')).toBe(false);
    expect(isFormatSupported('file.exe')).toBe(false);
    expect(isFormatSupported('file.unknown')).toBe(false);
  });

  it('should handle case-insensitive format detection', () => {
    expect(isFormatSupported('AUDIO.MP3')).toBe(true);
    expect(isFormatSupported('Audio.Mp3')).toBe(true);
    expect(isFormatSupported('VIDEO.MP4')).toBe(true);
  });

  it('should format file size correctly', () => {
    expect(formatSizeInMB(1024 * 1024)).toBe('1.00');
    expect(formatSizeInMB(100 * 1024 * 1024)).toBe('100.00');
    expect(formatSizeInMB(50 * 1024 * 1024)).toBe('50.00');
    expect(formatSizeInMB(0)).toBe('0.00');
  });

  it('should format duration correctly', () => {
    expect(formatDuration(0)).toBe('0m 0s');
    expect(formatDuration(60)).toBe('1m 0s');
    expect(formatDuration(3600)).toBe('1h 0m 0s');
    expect(formatDuration(3661)).toBe('1h 1m 1s');
    expect(formatDuration(7200)).toBe('2h 0m 0s');
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('should have correct max file size', () => {
    expect(MAX_FILE_SIZE).toBe(100 * 1024 * 1024);
  });

  it('should have correct max duration', () => {
    expect(MAX_DURATION).toBe(2 * 60 * 60);
  });

  it('should validate multiple formats in sequence', () => {
    const files = [
      'meeting.mp3',
      'podcast.wav',
      'video.mp4',
      'clip.mov',
      'song.flac',
      'interview.aac',
    ];

    files.forEach((file) => {
      expect(isFormatSupported(file)).toBe(true);
    });
  });

  it('should reject invalid formats', () => {
    const invalidFiles = [
      'document.pdf',
      'image.jpg',
      'image.png',
      'archive.zip',
      'executable.exe',
      'script.js',
    ];

    invalidFiles.forEach((file) => {
      expect(isFormatSupported(file)).toBe(false);
    });
  });

  it('should handle edge cases for format detection', () => {
    expect(getFormatType('')).toBe('unknown');
    expect(getFormatType('.')).toBe('unknown');
    expect(getFormatType('.mp3')).toBe('audio');
    expect(isFormatSupported('')).toBe(false);
  });
});
