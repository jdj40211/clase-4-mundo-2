import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KeywordRule } from '../types/keyword.types.js';
import { logger } from '../utils/logger.js';

let rules: KeywordRule[] = [];

export function loadKeywordRules(filePath?: string): KeywordRule[] {
  const path = filePath ?? resolve(process.cwd(), 'keywords.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed: KeywordRule[] = JSON.parse(raw);

  // Sort by priority (lower number = higher priority)
  rules = parsed
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  logger.info({ count: rules.length }, 'Loaded keyword rules');
  return rules;
}

export function getKeywordRules(): KeywordRule[] {
  return rules;
}

export function matchKeyword(commentText: string): KeywordRule | null {
  const text = commentText.trim();

  for (const rule of rules) {
    const keywords = [rule.keyword, ...rule.aliases];

    for (const kw of keywords) {
      if (isMatch(text, kw, rule.matchType)) {
        return rule;
      }
    }
  }

  return null;
}

function isMatch(text: string, keyword: string, matchType: KeywordRule['matchType']): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  switch (matchType) {
    case 'exact':
      return lowerText === lowerKeyword;

    case 'contains':
      return lowerText.includes(lowerKeyword);

    case 'word_boundary': {
      const escaped = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(text);
    }
  }
}
