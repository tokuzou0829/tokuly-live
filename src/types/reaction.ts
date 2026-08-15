export type Reaction = "like" | "dislike";

export type StreamReaction = {
  reaction: Reaction | null;
  like_count: number;
  dislike_count: number;
};

export type DailyReactionAnalytics = {
  date: string;
  like_count: number;
  dislike_count: number;
  reaction_count: number;
  like_rate_percent: number | null;
  dislike_rate_percent: number | null;
  net_score: number;
};

export type ReactionAnalytics = {
  scope: {
    type: "channel" | "stream";
    id: number;
  };
  timezone: string;
  from_date: string;
  to_date: string;
  total_likes: number;
  total_dislikes: number;
  total_reactions: number;
  like_rate_percent: number | null;
  dislike_rate_percent: number | null;
  net_score: number;
  daily: DailyReactionAnalytics[];
};
