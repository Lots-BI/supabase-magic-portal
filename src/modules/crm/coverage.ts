export type CoverageGap = {
  mediaComments: number;
  identifiedComments: number;
  gap: number;
};

export function coverageGap(mediaComments: number, identifiedComments: number): CoverageGap {
  const media = Math.max(0, mediaComments);
  const identified = Math.max(0, identifiedComments);
  return {
    mediaComments: media,
    identifiedComments: identified,
    gap: Math.max(0, media - identified),
  };
}

export type MediaIdentificationGap = {
  igMediaId: string;
  mediaComments: number;
  ingestedComments: number;
  gap: number;
};

export function mediaIdentificationGap(
  mediaCommentsCount: number,
  ingestedComments: number,
  igMediaId: string,
): MediaIdentificationGap {
  const gap = coverageGap(mediaCommentsCount, ingestedComments);
  return {
    igMediaId,
    mediaComments: gap.mediaComments,
    ingestedComments: gap.identifiedComments,
    gap: gap.gap,
  };
}
