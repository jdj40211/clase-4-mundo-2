import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MetaCommentValue } from '../types/meta.types.js';
import type { KeywordRule } from '../types/keyword.types.js';

// Mock instagram service
const mockSendTextDM = vi.fn().mockResolvedValue({ recipient_id: '123', message_id: 'm1' });
const mockSendButtonDM = vi.fn().mockResolvedValue({ recipient_id: '123', message_id: 'm2' });

vi.mock('../services/instagram.service.js', () => ({
  sendTextDM: (...args: unknown[]) => mockSendTextDM(...args),
  sendButtonDM: (...args: unknown[]) => mockSendButtonDM(...args),
  getUserProfile: vi.fn().mockResolvedValue({ id: '123', username: 'testuser' }),
}));

vi.mock('../config/env.js', () => ({
  getEnv: () => ({
    META_APP_SECRET: 'test',
    META_VERIFY_TOKEN: 'test',
    INSTAGRAM_PAGE_ACCESS_TOKEN: 'test',
    INSTAGRAM_PAGE_ID: '123',
    PORT: 3000,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ADMIN_API_KEY: 'test',
  }),
}));

import { handleComment } from '../handlers/comment.handler.js';
import { loadKeywordRules } from '../services/keyword.service.js';
import { resetAll } from '../services/cooldown.service.js';

function makeComment(text: string, userId = 'user1', username = 'testuser'): MetaCommentValue {
  return {
    from: { id: userId, username },
    media: { id: 'media1', media_product_type: 'FEED' },
    id: `comment_${Date.now()}`,
    text,
    timestamp: new Date().toISOString(),
  };
}

const testRules: KeywordRule[] = [
  {
    id: 'clase',
    keyword: 'CLASE',
    aliases: [],
    matchType: 'contains',
    priority: 1,
    enabled: true,
    cooldownMinutes: 60,
    response: {
      type: 'button',
      text: 'Hola {{username}}! Aca te dejo el link:',
      buttons: [{ type: 'web_url', title: 'Inscribirme', url: 'https://example.com/clase' }],
    },
  },
  {
    id: 'ai',
    keyword: 'AI',
    aliases: ['IA'],
    matchType: 'word_boundary',
    priority: 4,
    enabled: true,
    cooldownMinutes: 60,
    response: {
      type: 'text',
      text: 'Hola {{username}}! Info sobre AI:',
    },
  },
];

describe('comment.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAll();
    const path = join(tmpdir(), `test-keywords-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify(testRules));
    loadKeywordRules(path);
  });

  it('sends button DM when keyword matches with buttons', async () => {
    await handleComment(makeComment('quiero la CLASE'));

    expect(mockSendButtonDM).toHaveBeenCalledOnce();
    expect(mockSendButtonDM).toHaveBeenCalledWith(
      'user1',
      'Hola testuser! Aca te dejo el link:',
      testRules[0].response.buttons,
    );
  });

  it('sends text DM when keyword matches without buttons', async () => {
    await handleComment(makeComment('tell me about AI'));

    expect(mockSendTextDM).toHaveBeenCalledOnce();
    expect(mockSendTextDM).toHaveBeenCalledWith(
      'user1',
      'Hola testuser! Info sobre AI:',
    );
  });

  it('does not send DM when no keyword matches', async () => {
    await handleComment(makeComment('hello world'));

    expect(mockSendTextDM).not.toHaveBeenCalled();
    expect(mockSendButtonDM).not.toHaveBeenCalled();
  });

  it('respects cooldown — does not send duplicate DM', async () => {
    await handleComment(makeComment('CLASE'));
    await handleComment(makeComment('CLASE'));

    expect(mockSendButtonDM).toHaveBeenCalledOnce();
  });

  it('allows DM to different user even if same keyword', async () => {
    await handleComment(makeComment('CLASE', 'user1', 'user1'));
    await handleComment(makeComment('CLASE', 'user2', 'user2'));

    expect(mockSendButtonDM).toHaveBeenCalledTimes(2);
  });

  it('renders {{username}} template', async () => {
    await handleComment(makeComment('tell me about AI', 'user1', 'juancadile'));

    expect(mockSendTextDM).toHaveBeenCalledWith(
      'user1',
      'Hola juancadile! Info sobre AI:',
    );
  });

  it('matches aliases (IA → ai rule)', async () => {
    await handleComment(makeComment('me gusta la IA'));

    expect(mockSendTextDM).toHaveBeenCalledOnce();
  });
});
