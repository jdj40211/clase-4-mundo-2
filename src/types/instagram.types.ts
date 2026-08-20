export interface InstagramSendMessageResponse {
  recipient_id: string;
  message_id: string;
}

export interface InstagramUserProfile {
  id: string;
  username: string;
  name?: string;
}

export interface InstagramApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}
