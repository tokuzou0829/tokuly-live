export type ViewAnalyticsScope = {
  type: "channel" | "stream" | "clip";
  id: number | string;
};

export type ViewAnalyticsSummary = {
  total_views: number;
  lifetime_views: number;
  stream_views?: number;
  clip_views?: number;
  lifetime_stream_views?: number;
  lifetime_clip_views?: number;
};

export type ViewAnalyticsDay = {
  date: string;
  total_views: number;
  stream_views?: number;
  clip_views?: number;
};

export type ViewAnalytics = {
  scope: ViewAnalyticsScope;
  timezone: string;
  month: string;
  summary: ViewAnalyticsSummary;
  daily: ViewAnalyticsDay[];
};
