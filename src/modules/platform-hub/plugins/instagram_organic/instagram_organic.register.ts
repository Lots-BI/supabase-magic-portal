import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { INSTAGRAM_ORGANIC_MANIFEST } from "./instagram_organic.manifest";
import { InstagramOrganicAdapter } from "./instagram_organic.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: INSTAGRAM_ORGANIC_MANIFEST, adapter: InstagramOrganicAdapter };
}
