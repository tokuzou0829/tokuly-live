export type StreamCommentAuthor = {
  id: number | null;
  type: "user" | "channel";
  channel_id: number | null;
  name: string;
  handle: string;
  profile_photo_url: string;
};

export type StreamComment = {
  id: number;
  parent_comment_id: number | null;
  content: string;
  author: StreamCommentAuthor;
  reply_count: number;
  replies?: StreamComment[];
  has_more_replies?: boolean;
  next_reply_after_id?: number | null;
  creator_reacted_at: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

export type StreamCommentPage = {
  data: StreamComment[];
  next_before_id: number | null;
  has_more: boolean;
};

export type StreamCommentReplyPage = {
  data: StreamComment[];
  next_after_id: number | null;
  has_more: boolean;
};
