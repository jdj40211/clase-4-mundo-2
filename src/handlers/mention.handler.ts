import type { MetaMentionValue } from '../types/meta.types.js';
import { logger } from '../utils/logger.js';
import { getMediaOwner, sendTextDM } from '../services/instagram.service.js';
import { getEnv } from '../config/env.js';
import { logDM } from '../services/dmlog.service.js';

export async function handleMention(mention: MetaMentionValue): Promise<void> {
  const { media_id } = mention;

  logger.info({ media_id }, 'Received story mention');

  try {
    const owner = await getMediaOwner(media_id);
    if (!owner) {
      logger.warn({ media_id }, 'Could not get media owner for mention');
      return;
    }

    // Don't DM ourselves
    const env = getEnv();
    if (owner.id === env.INSTAGRAM_PAGE_ID) {
      logger.debug('Ignoring self-mention');
      return;
    }

    await sendTextDM(
      owner.id,
      'Hola! Gracias por mencionarnos en tu historia! Si necesitas algo, escribinos por aca.',
    );

    logDM({
      igUserId: owner.id,
      direction: 'outbound',
      messageType: 'mention_reply',
      content: 'Story mention reply',
    }).catch(() => {});

    logger.info({ userId: owner.id, username: owner.username, media_id }, 'Story mention reply sent');
  } catch (err) {
    logger.error({ err, media_id }, 'Error handling story mention');
  }
}
