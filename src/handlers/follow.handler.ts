import { logger } from '../utils/logger.js';

export function handleFollow(userId: string): void {
  logger.info({ userId }, 'Received follow/icebreaker event (no action — Phase 2)');
}
