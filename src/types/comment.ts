export type StreamCommentAuthor = {
  id: number | null;
  type?: "user" | "channel";
  channel_id?: number | null;
  name: string;
  handle?: string;
  profile_photo_url: string;
};

export type StreamComment = {
  id: number;
  content: string;
  author: StreamCommentAuthor;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

export type StreamCommentPage = {
  data: StreamComment[];
  next_before_id: number | null;
  has_more: boolean;
};
