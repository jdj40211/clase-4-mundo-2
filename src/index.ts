import express from 'express';
import type { Request, Response } from 'express';
import { join } from 'node:path';
import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { loadKeywordRules } from './services/keyword.service.js';
import { initDb } from './services/db.js';
import { startEmailReminder } from './services/reminder.service.js';
import { webhookRouter } from './webhooks/router.js';

// Load and validate env vars
const env = loadEnv();

// Load keyword rules
loadKeywordRules();

const app = express();

// Parse JSON body and preserve raw body for signature verification
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

// Health endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

// Privacy policy. Meta requires a public URL for it before the app can go live,
// and asks for a data deletion URL too — the #eliminacion anchor covers that.
const privacyPage = join(process.cwd(), 'public', 'privacidad.html');
app.get(['/privacidad', '/privacy'], (_req: Request, res: Response) => {
  res.sendFile(privacyPage);
});

// Webhook routes
app.use('/webhook', webhookRouter);

// Initialize database and start server
initDb()
  .then(() => {
    startEmailReminder();
    app.listen(env.PORT, '0.0.0.0', () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, 'GolemBot server started');
    });
  })
  .catch((err) => {
    logger.fatal({ err }, 'Failed to initialize database');
    process.exit(1);
  });

export { app };
