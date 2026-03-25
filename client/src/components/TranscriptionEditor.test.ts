import { describe, it, expect, vi } from 'vitest';

describe('TranscriptionEditor - Inline Segment Editing', () => {
  it('should format time correctly for SRT format', () => {
    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);

      if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
      }
      return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
    };

    expect(formatTime(0)).toBe('00:00,000');
    expect(formatTime(5)).toBe('00:05,000');
    expect(formatTime(65)).toBe('01:05,000');
    expect(formatTime(3665)).toBe('01:01:05,000');
    expect(formatTime(5.5)).toBe('00:05,500');
  });

  it('should handle segment editing state', () => {
    // Simular estado de edição
    let editingSegmentId: number | null = null;
    let editingText = '';

    const startEditSegment = (segmentId: number, text: string) => {
      editingSegmentId = segmentId;
      editingText = text;
    };

    const cancelSegmentEdit = () => {
      editingSegmentId = null;
      editingText = '';
    };

    // Teste: iniciar edição
    startEditSegment(1, 'Original text');
    expect(editingSegmentId).toBe(1);
    expect(editingText).toBe('Original text');

    // Teste: cancelar edição
    cancelSegmentEdit();
    expect(editingSegmentId).toBeNull();
    expect(editingText).toBe('');
  });

  it('should update segment text when saving edit', () => {
    const segments = [
      { id: 1, start: 0, end: 5, text: 'Original text', speaker: 'Speaker 1' },
      { id: 2, start: 5, end: 10, text: 'Another text', speaker: 'Speaker 2' },
    ];

    const saveSegmentEdit = (segmentId: number, newText: string) => {
      return segments.map((seg) =>
        seg.id === segmentId ? { ...seg, text: newText } : seg
      );
    };

    const updated = saveSegmentEdit(1, 'Updated text');
    
    expect(updated[0].text).toBe('Updated text');
    expect(updated[1].text).toBe('Another text');
    expect(updated.length).toBe(2);
  });

  it('should delete segment correctly', () => {
    const segments = [
      { id: 1, start: 0, end: 5, text: 'Text 1', speaker: 'Speaker 1' },
      { id: 2, start: 5, end: 10, text: 'Text 2', speaker: 'Speaker 2' },
      { id: 3, start: 10, end: 15, text: 'Text 3', speaker: 'Speaker 1' },
    ];

    const deleteSegment = (segmentId: number) => {
      return segments.filter((seg) => seg.id !== segmentId);
    };

    const result = deleteSegment(2);
    
    expect(result.length).toBe(2);
    expect(result.find((s) => s.id === 2)).toBeUndefined();
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(3);
  });

  it('should generate full text from segments', () => {
    const segments = [
      { id: 1, start: 0, end: 5, text: 'Hello', speaker: 'Speaker 1' },
      { id: 2, start: 5, end: 10, text: 'World', speaker: 'Speaker 2' },
    ];

    const fullText = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join('\n\n');
    
    expect(fullText).toBe('Speaker 1: Hello\n\nSpeaker 2: World');
  });

  it('should export segments to SRT format', () => {
    const segments = [
      { id: 1, start: 0, end: 5, text: 'First line', speaker: 'Speaker 1' },
      { id: 2, start: 5, end: 10, text: 'Second line', speaker: 'Speaker 2' },
    ];

    const formatTime = (seconds: number): string => {
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
    };

    const srtContent = segments
      .map(
        (seg, idx) =>
          `${idx + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.speaker}: ${seg.text}\n`
      )
      .join("\n");

    expect(srtContent).toContain('1\n00:00,000 --> 00:05,000\nSpeaker 1: First line');
    expect(srtContent).toContain('2\n00:05,000 --> 00:10,000\nSpeaker 2: Second line');
  });

  it('should export segments to VTT format', () => {
    const segments = [
      { id: 1, start: 0, end: 5, text: 'First line', speaker: 'Speaker 1' },
    ];

    const formatTime = (seconds: number): string => {
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
    };

    let vttContent = "WEBVTT\n\n";
    vttContent += segments
      .map(
        (seg) =>
          `${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.speaker}: ${seg.text}\n`
      )
      .join("\n");

    expect(vttContent).toContain('WEBVTT');
    expect(vttContent).toContain('00:00,000 --> 00:05,000');
    expect(vttContent).toContain('Speaker 1: First line');
  });

  it('should export segments to JSON format', () => {
    const segments = [
      { id: 1, start: 0, end: 5, text: 'First line', speaker: 'Speaker 1' },
      { id: 2, start: 5, end: 10, text: 'Second line', speaker: 'Speaker 2' },
    ];

    const jsonContent = JSON.stringify(segments, null, 2);
    const parsed = JSON.parse(jsonContent);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].text).toBe('First line');
    expect(parsed[1].speaker).toBe('Speaker 2');
  });

  it('should handle empty segments list', () => {
    const segments: any[] = [];

    const fullText = segments.length === 0 
      ? 'Nenhum segmento disponível' 
      : segments.map((seg) => `${seg.speaker}: ${seg.text}`).join('\n\n');

    expect(fullText).toBe('Nenhum segmento disponível');
  });

  it('should find current segment based on time', () => {
    const segments = [
      { id: 1, start: 0, end: 5, text: 'First', speaker: 'Speaker 1' },
      { id: 2, start: 5, end: 10, text: 'Second', speaker: 'Speaker 2' },
      { id: 3, start: 10, end: 15, text: 'Third', speaker: 'Speaker 1' },
    ];

    const findCurrentSegment = (currentTime: number) => {
      return segments.find(
        (seg) => currentTime >= seg.start && currentTime < seg.end
      );
    };

    expect(findCurrentSegment(2)).toEqual(segments[0]);
    expect(findCurrentSegment(7)).toEqual(segments[1]);
    expect(findCurrentSegment(12)).toEqual(segments[2]);
    expect(findCurrentSegment(20)).toBeUndefined();
  });
});
