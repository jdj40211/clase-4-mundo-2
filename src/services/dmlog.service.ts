import { getDb } from './db.js';

export async function logDM(data: {
  igUserId: string;
  direction: 'inbound' | 'outbound';
  messageType?: string;
  keywordId?: string;
  content?: string;
}): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO dm_log (ig_user_id, direction, message_type, keyword_id, content)
    VALUES (${data.igUserId}, ${data.direction}, ${data.messageType ?? null}, ${data.keywordId ?? null}, ${data.content ?? null})
  `;
}
