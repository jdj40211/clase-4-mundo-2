import type { MetaWebhookPayload, MetaCommentValue, MetaMessagingEvent, MetaMentionValue } from '../types/meta.types.js';

export type ParsedEvent =
  | { type: 'comment'; data: MetaCommentValue }
  | { type: 'message'; data: MetaMessagingEvent }
  | { type: 'postback'; data: MetaMessagingEvent }
  | { type: 'mention'; data: MetaMentionValue };

export function parseWebhookPayload(payload: MetaWebhookPayload): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  if (payload.object !== 'instagram') return events;

  for (const entry of payload.entry) {
    // Comment and mention events come via changes
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          events.push({ type: 'comment', data: change.value });
        } else if (change.field === 'mentions') {
          events.push({ type: 'mention', data: change.value as unknown as MetaMentionValue });
        }
      }
    }

    // DM and postback events come via messaging
    if (entry.messaging) {
      for (const event of entry.messaging) {
        if (event.message && !event.message.is_echo) {
          events.push({ type: 'message', data: event });
        } else if (event.postback) {
          events.push({ type: 'postback', data: event });
        }
      }
    }
  }

  return events;
}
