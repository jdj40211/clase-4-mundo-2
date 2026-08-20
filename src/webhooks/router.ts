import { Router } from 'express';
import type { Request, Response } from 'express';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { verifySignature } from './verify.js';
import { parseWebhookPayload } from './parser.js';
import { handleComment } from '../handlers/comment.handler.js';
import { handleMessage } from '../handlers/message.handler.js';
import { handlePostback } from '../handlers/postback.handler.js';
import { handleMention } from '../handlers/mention.handler.js';
import type { MetaWebhookPayload } from '../types/meta.types.js';

export const webhookRouter = Router();

// GET /webhook — Meta verification challenge
webhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token === getEnv().META_VERIFY_TOKEN) {
    logger.info('Webhook verification successful');
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, token }, 'Webhook verification failed');
  res.status(403).send('Forbidden');
});

// POST /webhook — Receive events
webhookRouter.post('/', verifySignature, (req: Request, res: Response) => {
  // Respond 200 immediately to stay within Meta's 5-second window
  res.status(200).send('EVENT_RECEIVED');

  const payload = req.body as MetaWebhookPayload;

  // Process events asynchronously
  setImmediate(() => {
    try {
      const events = parseWebhookPayload(payload);
      logger.info({ eventCount: events.length }, 'Processing webhook events');

      for (const event of events) {
        switch (event.type) {
          case 'comment':
            handleComment(event.data).catch((err) =>
              logger.error({ err, event: event.data }, 'Error handling comment'),
            );
            break;
          case 'message':
            handleMessage(event.data).catch((err) =>
              logger.error({ err }, 'Error handling message'),
            );
            break;
          case 'postback':
            handlePostback(event.data).catch((err) =>
              logger.error({ err }, 'Error handling postback'),
            );
            break;
          case 'mention':
            handleMention(event.data).catch((err) =>
              logger.error({ err }, 'Error handling mention'),
            );
            break;
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error parsing webhook payload');
    }
  });
});
