import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadKeywordRules, matchKeyword } from '../services/keyword.service.js';
import type { KeywordRule } from '../types/keyword.types.js';

function writeTempRules(rules: KeywordRule[]): string {
  const path = join(tmpdir(), `test-keywords-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(rules));
  return path;
}

const baseRule = (overrides: Partial<KeywordRule> & Pick<KeywordRule, 'id' | 'keyword' | 'matchType'>): KeywordRule => ({
  aliases: [],
  priority: 1,
  enabled: true,
  cooldownMinutes: 60,
  response: { type: 'text', text: 'Hello {{username}}!' },
  ...overrides,
});

describe('keyword.service', () => {
  describe('matchKeyword — exact', () => {
    beforeEach(() => {
      const rules = [baseRule({ id: 'app', keyword: 'APP', matchType: 'exact' })];
      loadKeywordRules(writeTempRules(rules));
    });

    it('matches exact keyword (case-insensitive)', () => {
      expect(matchKeyword('APP')).toBeTruthy();
      expect(matchKeyword('app')).toBeTruthy();
      expect(matchKeyword('App')).toBeTruthy();
    });

    it('does not match partial text', () => {
      expect(matchKeyword('I want the APP now')).toBeNull();
      expect(matchKeyword('APPLE')).toBeNull();
      expect(matchKeyword('happy')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(matchKeyword('  APP  ')).toBeTruthy();
    });
  });

  describe('matchKeyword — contains', () => {
    beforeEach(() => {
      const rules = [baseRule({ id: 'clase', keyword: 'CLASE', matchType: 'contains' })];
      loadKeywordRules(writeTempRules(rules));
    });

    it('matches when keyword is contained in text', () => {
      expect(matchKeyword('quiero la CLASE')).toBeTruthy();
      expect(matchKeyword('CLASE por favor')).toBeTruthy();
      expect(matchKeyword('dame la clase ya')).toBeTruthy();
    });

    it('matches exact text too', () => {
      expect(matchKeyword('CLASE')).toBeTruthy();
    });

    it('does not match if keyword is not present', () => {
      expect(matchKeyword('quiero info')).toBeNull();
    });
  });

  describe('matchKeyword — word_boundary', () => {
    beforeEach(() => {
      const rules = [baseRule({ id: 'ai', keyword: 'AI', matchType: 'word_boundary', aliases: ['IA'] })];
      loadKeywordRules(writeTempRules(rules));
    });

    it('matches standalone word', () => {
      expect(matchKeyword('I love AI')).toBeTruthy();
      expect(matchKeyword('AI is great')).toBeTruthy();
      expect(matchKeyword('tell me about AI please')).toBeTruthy();
    });

    it('does not match as part of another word', () => {
      expect(matchKeyword('FAIR')).toBeNull();
      expect(matchKeyword('MAIN')).toBeNull();
      expect(matchKeyword('LAID')).toBeNull();
    });

    it('matches aliases with word boundary', () => {
      expect(matchKeyword('me gusta la IA')).toBeTruthy();
      expect(matchKeyword('IA es genial')).toBeTruthy();
    });

    it('does not match alias as part of another word', () => {
      expect(matchKeyword('DIARIO')).toBeNull();
    });
  });

  describe('aliases', () => {
    beforeEach(() => {
      const rules = [
        baseRule({
          id: 'stanford',
          keyword: 'STANFORD',
          matchType: 'contains',
          aliases: ['STANDFORD', 'STANFOR'],
        }),
      ];
      loadKeywordRules(writeTempRules(rules));
    });

    it('matches primary keyword', () => {
      expect(matchKeyword('quiero el paper de STANFORD')).toBeTruthy();
    });

    it('matches misspelling alias', () => {
      expect(matchKeyword('STANDFORD paper please')).toBeTruthy();
      expect(matchKeyword('el paper de STANFOR')).toBeTruthy();
    });
  });

  describe('priority ordering', () => {
    beforeEach(() => {
      const rules = [
        baseRule({ id: 'low-priority', keyword: 'TEST', matchType: 'contains', priority: 10 }),
        baseRule({ id: 'high-priority', keyword: 'TEST', matchType: 'exact', priority: 1 }),
      ];
      loadKeywordRules(writeTempRules(rules));
    });

    it('returns highest priority match (lowest number)', () => {
      const result = matchKeyword('TEST');
      expect(result?.id).toBe('high-priority');
    });
  });

  describe('disabled rules', () => {
    beforeEach(() => {
      const rules = [
        baseRule({ id: 'disabled', keyword: 'SECRET', matchType: 'exact', enabled: false }),
        baseRule({ id: 'enabled', keyword: 'PUBLIC', matchType: 'exact', enabled: true }),
      ];
      loadKeywordRules(writeTempRules(rules));
    });

    it('skips disabled rules', () => {
      expect(matchKeyword('SECRET')).toBeNull();
    });

    it('matches enabled rules', () => {
      expect(matchKeyword('PUBLIC')).toBeTruthy();
    });
  });

  describe('emoji in comments', () => {
    beforeEach(() => {
      const rules = [baseRule({ id: 'clase', keyword: 'CLASE', matchType: 'contains' })];
      loadKeywordRules(writeTempRules(rules));
    });

    it('matches keyword even with emojis', () => {
      expect(matchKeyword('quiero la CLASE 🔥🔥')).toBeTruthy();
      expect(matchKeyword('🎯 CLASE por favor')).toBeTruthy();
    });
  });
});
