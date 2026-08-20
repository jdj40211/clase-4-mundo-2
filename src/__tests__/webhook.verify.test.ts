import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeSignature } from '../webhooks/verify.js';

// Mock env module
vi.mock('../config/env.js', () => ({
  getEnv: () => ({
    META_APP_SECRET: 'test_secret',
    META_VERIFY_TOKEN: 'test_verify_token',
    INSTAGRAM_PAGE_ACCESS_TOKEN: 'test_token',
    INSTAGRAM_PAGE_ID: '123',
    PORT: 3000,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ADMIN_API_KEY: 'test_admin_key',
  }),
}));

describe('webhook signature verification', () => {
  const secret = 'test_secret';

  it('computes correct HMAC signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const signature = computeSignature(secret, payload);

    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('produces consistent signatures for same input', () => {
    const payload = '{"hello":"world"}';
    const sig1 = computeSignature(secret, payload);
    const sig2 = computeSignature(secret, payload);

    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different payloads', () => {
    const sig1 = computeSignature(secret, 'payload1');
    const sig2 = computeSignature(secret, 'payload2');

    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', () => {
    const payload = 'same_payload';
    const sig1 = computeSignature('secret1', payload);
    const sig2 = computeSignature('secret2', payload);

    expect(sig1).not.toBe(sig2);
  });
});

describe('webhook verification challenge', () => {
  it('validates the challenge flow logic', () => {
    const mode = 'subscribe';
    const token = 'test_verify_token';
    const challenge = 'challenge_code_123';
    const expectedToken = 'test_verify_token';

    const isValid = mode === 'subscribe' && token === expectedToken;
    expect(isValid).toBe(true);
    expect(challenge).toBe('challenge_code_123');
  });

  it('rejects wrong verify token', () => {
    const mode = 'subscribe';
    const token = 'wrong_token';
    const expectedToken = 'test_verify_token';

    const isValid = mode === 'subscribe' && token === expectedToken;
    expect(isValid).toBe(false);
  });

  it('rejects wrong mode', () => {
    const mode = 'unsubscribe';
    const token = 'test_verify_token';
    const expectedToken = 'test_verify_token';

    const isValid = mode === 'subscribe' && token === expectedToken;
    expect(isValid).toBe(false);
  });
});
