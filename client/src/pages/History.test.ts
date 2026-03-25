import { describe, it, expect } from 'vitest';

describe('History Page - Search and Filters', () => {
  it('should filter transcriptions by language', () => {
    const transcriptions = [
      { id: 1, fileName: 'audio1.mp3', inputLanguage: 'pt', segments: [], createdAt: new Date() },
      { id: 2, fileName: 'audio2.mp3', inputLanguage: 'en', segments: [], createdAt: new Date() },
      { id: 3, fileName: 'audio3.mp3', inputLanguage: 'es', segments: [], createdAt: new Date() },
    ];

    const filterByLanguage = (items: any[], lang: string) => {
      if (lang === 'all') return items;
      return items.filter((t) => t.inputLanguage === lang);
    };

    expect(filterByLanguage(transcriptions, 'pt')).toHaveLength(1);
    expect(filterByLanguage(transcriptions, 'en')).toHaveLength(1);
    expect(filterByLanguage(transcriptions, 'es')).toHaveLength(1);
    expect(filterByLanguage(transcriptions, 'all')).toHaveLength(3);
  });

  it('should sort transcriptions by date', () => {
    const date1 = new Date('2026-01-01');
    const date2 = new Date('2026-01-02');
    const date3 = new Date('2026-01-03');

    const transcriptions = [
      { id: 1, fileName: 'audio1.mp3', inputLanguage: 'pt', segments: [], createdAt: date2 },
      { id: 2, fileName: 'audio2.mp3', inputLanguage: 'en', segments: [], createdAt: date1 },
      { id: 3, fileName: 'audio3.mp3', inputLanguage: 'es', segments: [], createdAt: date3 },
    ];

    const sortByDate = (items: any[], order: 'newest' | 'oldest') => {
      if (order === 'newest') {
        return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    };

    const newestFirst = sortByDate(transcriptions, 'newest');
    expect(newestFirst[0].id).toBe(3);
    expect(newestFirst[1].id).toBe(1);
    expect(newestFirst[2].id).toBe(2);

    const oldestFirst = sortByDate(transcriptions, 'oldest');
    expect(oldestFirst[0].id).toBe(2);
    expect(oldestFirst[1].id).toBe(1);
    expect(oldestFirst[2].id).toBe(3);
  });

  it('should sort transcriptions by name', () => {
    const transcriptions = [
      { id: 1, fileName: 'zebra.mp3', inputLanguage: 'pt', segments: [], createdAt: new Date() },
      { id: 2, fileName: 'apple.mp3', inputLanguage: 'en', segments: [], createdAt: new Date() },
      { id: 3, fileName: 'banana.mp3', inputLanguage: 'es', segments: [], createdAt: new Date() },
    ];

    const sortByName = (items: any[]) => {
      return [...items].sort((a, b) => a.fileName.localeCompare(b.fileName));
    };

    const sorted = sortByName(transcriptions);
    expect(sorted[0].fileName).toBe('apple.mp3');
    expect(sorted[1].fileName).toBe('banana.mp3');
    expect(sorted[2].fileName).toBe('zebra.mp3');
  });

  it('should search transcriptions by query', () => {
    const transcriptions = [
      { id: 1, fileName: 'meeting_2026.mp3', originalText: 'Discussão sobre projeto', segments: [] },
      { id: 2, fileName: 'podcast_tech.mp3', originalText: 'Tecnologia e inovação', segments: [] },
      { id: 3, fileName: 'interview_ceo.mp3', originalText: 'Entrevista com CEO', segments: [] },
    ];

    const searchTranscriptions = (items: any[], query: string) => {
      const q = query.toLowerCase();
      return items.filter(
        (t) =>
          t.fileName.toLowerCase().includes(q) ||
          t.originalText.toLowerCase().includes(q)
      );
    };

    expect(searchTranscriptions(transcriptions, 'projeto')).toHaveLength(1);
    expect(searchTranscriptions(transcriptions, 'tecnologia')).toHaveLength(1);
    expect(searchTranscriptions(transcriptions, 'entrevista')).toHaveLength(1);
    expect(searchTranscriptions(transcriptions, 'mp3')).toHaveLength(3);
    expect(searchTranscriptions(transcriptions, 'inexistente')).toHaveLength(0);
  });

  it('should combine filters and sorting', () => {
    const transcriptions = [
      { id: 1, fileName: 'z_file.mp3', inputLanguage: 'pt', createdAt: new Date('2026-01-01'), segments: [] },
      { id: 2, fileName: 'a_file.mp3', inputLanguage: 'en', createdAt: new Date('2026-01-02'), segments: [] },
      { id: 3, fileName: 'b_file.mp3', inputLanguage: 'pt', createdAt: new Date('2026-01-03'), segments: [] },
    ];

    const filterAndSort = (items: any[], lang: string, sortBy: string) => {
      let filtered = lang === 'all' ? items : items.filter((t) => t.inputLanguage === lang);
      
      if (sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (sortBy === 'name') {
        filtered.sort((a, b) => a.fileName.localeCompare(b.fileName));
      }
      
      return filtered;
    };

    const result = filterAndSort(transcriptions, 'pt', 'name');
    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe('b_file.mp3');
    expect(result[1].fileName).toBe('z_file.mp3');
  });

  it('should handle empty search results', () => {
    const transcriptions: any[] = [];

    const searchTranscriptions = (items: any[], query: string) => {
      const q = query.toLowerCase();
      return items.filter(
        (t) =>
          t.fileName.toLowerCase().includes(q) ||
          t.originalText.toLowerCase().includes(q)
      );
    };

    expect(searchTranscriptions(transcriptions, 'qualquer coisa')).toHaveLength(0);
  });

  it('should count results correctly', () => {
    const transcriptions = [
      { id: 1, fileName: 'file1.mp3', inputLanguage: 'pt', segments: [], createdAt: new Date() },
      { id: 2, fileName: 'file2.mp3', inputLanguage: 'en', segments: [], createdAt: new Date() },
      { id: 3, fileName: 'file3.mp3', inputLanguage: 'pt', segments: [], createdAt: new Date() },
    ];

    const filterByLanguage = (items: any[], lang: string) => {
      if (lang === 'all') return items;
      return items.filter((t) => t.inputLanguage === lang);
    };

    const ptCount = filterByLanguage(transcriptions, 'pt').length;
    const enCount = filterByLanguage(transcriptions, 'en').length;
    const allCount = filterByLanguage(transcriptions, 'all').length;

    expect(ptCount).toBe(2);
    expect(enCount).toBe(1);
    expect(allCount).toBe(3);
  });
});
