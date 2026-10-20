export interface GoogleAdsSearchRowV1 {
  campaign?: { id?: string; name?: string; status?: string };
  segments?: { date?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
  };
}

export interface GoogleAdsSearchResponseV1 {
  results?: GoogleAdsSearchRowV1[];
  nextPageToken?: string;
}
