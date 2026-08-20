export interface MetaWebhookPayload {
  object: string;
  entry: MetaEntry[];
}

export interface MetaEntry {
  id: string;
  time: number;
  changes?: MetaChange[];
  messaging?: MetaMessagingEvent[];
}

export interface MetaChange {
  field: string;
  value: MetaCommentValue;
}

export interface MetaCommentValue {
  from: {
    id: string;
    username: string;
  };
  media: {
    id: string;
    media_product_type: string;
  };
  id: string;
  text: string;
  timestamp: string;
}

export interface MetaMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MetaMessage;
  postback?: MetaPostback;
}

export interface MetaMessage {
  mid: string;
  text?: string;
  attachments?: MetaAttachment[];
  is_echo?: boolean;
}

export interface MetaPostback {
  mid: string;
  title: string;
  payload: string;
}

export interface MetaAttachment {
  type: string;
  payload: {
    url: string;
  };
}

export interface MetaMentionValue {
  media_id: string;
  comment_id?: string;
}
