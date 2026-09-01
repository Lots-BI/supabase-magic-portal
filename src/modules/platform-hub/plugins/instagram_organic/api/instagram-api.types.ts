export interface InstagramMediaRowV1 {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramMediaListResponseV1 {
  data?: InstagramMediaRowV1[];
  paging?: {
    cursors?: { after?: string };
    next?: string;
  };
  error?: { message: string; code?: number };
}

export interface InstagramInsightValueV1 {
  value?: number;
  end_time?: string;
}

export interface InstagramInsightsResponseV1 {
  data?: Array<{
    name: string;
    values?: InstagramInsightValueV1[];
    value?: number;
  }>;
  error?: { message: string; code?: number };
}
