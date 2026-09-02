export {
  PLATFORM_RELEASES,
  type PlatformReleaseAudience,
  type PlatformReleaseItem,
} from "@/content/platform-news/releases";

import { PLATFORM_RELEASES, type PlatformReleaseAudience } from "@/content/platform-news/releases";

export function listPlatformReleases(audience: "client" | "admin"): typeof PLATFORM_RELEASES {
  if (audience === "admin") return PLATFORM_RELEASES;
  return PLATFORM_RELEASES.filter(
    (item) => item.audience === "all" || item.audience === "client",
  );
}

export function latestPlatformRelease(
  audience: PlatformReleaseAudience | "client" | "admin",
): (typeof PLATFORM_RELEASES)[number] | undefined {
  const filter =
    audience === "all"
      ? () => true
      : (item: (typeof PLATFORM_RELEASES)[number]) =>
          item.audience === "all" || item.audience === audience;
  return PLATFORM_RELEASES.find(filter);
}
