import { getEnv } from '../config/env.js';
import type { InstagramSendMessageResponse, InstagramUserProfile } from '../types/instagram.types.js';
import type { MessageButton } from '../types/keyword.types.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const API_BASE = 'https://graph.instagram.com/v21.0';

/**
 * A message can be addressed either to a user (only valid inside the 24h
 * messaging window) or to a comment (private reply, valid for 7 days after
 * the comment, one per comment).
 */
export type Recipient = { id: string } | { comment_id: string };

function buildTextMessage(text: string): unknown {
  return { text };
}

function buildButtonMessage(text: string, buttons: MessageButton[]): unknown {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: text,
            buttons: buttons.map((b) => ({
              type: b.type,
              title: b.title,
              url: b.url,
              payload: b.payload,
            })),
          },
        ],
      },
    },
  };
}

async function send(
  recipient: Recipient,
  message: unknown,
): Promise<InstagramSendMessageResponse> {
  const env = getEnv();

  return withRetry<InstagramSendMessageResponse>(() =>
    fetch(`${API_BASE}/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.INSTAGRAM_PAGE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ recipient, message }),
    }),
  );
}

export async function sendTextDM(
  recipientId: string,
  text: string,
): Promise<InstagramSendMessageResponse> {
  logger.debug({ recipientId }, 'Sending text DM');
  return send({ id: recipientId }, buildTextMessage(text));
}

export async function sendButtonDM(
  recipientId: string,
  text: string,
  buttons: MessageButton[],
): Promise<InstagramSendMessageResponse> {
  logger.debug({ recipientId, buttonCount: buttons.length }, 'Sending button DM');
  return send({ id: recipientId }, buildButtonMessage(text, buttons));
}

/**
 * Reply privately to a comment. This is the only way to DM someone who has
 * never messaged the account, which is the normal case for a comment trigger.
 * Falls back to plain text if the button template is rejected, and finally to
 * a direct DM when a conversation is already open.
 */
export async function sendPrivateReply(
  commentId: string,
  userId: string,
  text: string,
  buttons?: MessageButton[],
): Promise<InstagramSendMessageResponse> {
  const hasButtons = Boolean(buttons?.length);

  try {
    logger.debug({ commentId, hasButtons }, 'Sending private reply');
    return await send(
      { comment_id: commentId },
      hasButtons ? buildButtonMessage(text, buttons!) : buildTextMessage(text),
    );
  } catch (err) {
    if (!hasButtons) {
      logger.warn({ err, commentId }, 'Private reply failed, trying direct DM');
      return sendTextDM(userId, text);
    }

    logger.warn({ err, commentId }, 'Button private reply failed, retrying as plain text');
    try {
      return await send({ comment_id: commentId }, buildTextMessage(text));
    } catch (textErr) {
      logger.warn({ err: textErr, commentId }, 'Private reply failed, trying direct DM');
      return sendButtonDM(userId, text, buttons!);
    }
  }
}

export async function getMediaOwner(mediaId: string): Promise<{ id: string; username: string } | null> {
  const env = getEnv();

  try {
    const response = await fetch(
      `${API_BASE}/${mediaId}?fields=owner{id,username}`,
      {
        headers: {
          Authorization: `Bearer ${env.INSTAGRAM_PAGE_ACCESS_TOKEN}`,
        },
      },
    );
    if (!response.ok) {
      logger.warn({ mediaId, status: response.status }, 'Failed to get media owner');
      return null;
    }
    const data = (await response.json()) as { owner?: { id: string; username: string } };
    return data.owner ?? null;
  } catch {
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<InstagramUserProfile> {
  const env = getEnv();

  return withRetry<InstagramUserProfile>(() =>
    fetch(`${API_BASE}/${userId}?fields=id,username,name`, {
      headers: {
        Authorization: `Bearer ${env.INSTAGRAM_PAGE_ACCESS_TOKEN}`,
      },
    }),
  );
}
