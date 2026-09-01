import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { createRegistrationCredentialAccess } from "../_internal/oauth/create-registration-credential-access";
import { FetchHttpClient } from "../_internal/http/fetch-http-client";
import { createMakePassiveProvider } from "../_internal/provider-framework/create-make-passive-provider";
import { createOfficialApiStubProvider } from "../_internal/provider-framework/create-official-api-stub-provider";
import { INSTAGRAM_ORGANIC_CAPABILITIES } from "./instagram_organic.capabilities";
import { INSTAGRAM_ORGANIC_MANIFEST } from "./instagram_organic.manifest";
import { createOfficialInstagramProvider } from "./providers/official-instagram.provider";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { HttpClientPort } from "../_internal/http/http-client.port";

export interface CreateInstagramOrganicAdapterOptions {
  credentialVault?: CredentialVaultPortV1;
  httpClient?: HttpClientPort;
}

export function createInstagramOrganicAdapter(
  options: CreateInstagramOrganicAdapterOptions = {},
): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: INSTAGRAM_ORGANIC_MANIFEST.key,
    platformLabel: INSTAGRAM_ORGANIC_MANIFEST.label,
  });

  const officialApi: ProviderPortV1 = options.credentialVault
    ? createOfficialInstagramProvider({
        credentialAccess: createRegistrationCredentialAccess(
          options.credentialVault,
          INSTAGRAM_ORGANIC_MANIFEST.key,
          options.httpClient,
        ),
        httpClient: options.httpClient ?? new FetchHttpClient(),
      })
    : createOfficialApiStubProvider({ pluginKey: INSTAGRAM_ORGANIC_MANIFEST.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialApi],
  ]);

  return {
    manifest: INSTAGRAM_ORGANIC_MANIFEST,
    supports(capability: Capability) {
      return (INSTAGRAM_ORGANIC_CAPABILITIES as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for instagram_organic: ${providerType}`);
      }
      return provider;
    },
  };
}

export function createInstagramOrganicRegistration(
  credentialVault: CredentialVaultPortV1,
  options?: Omit<CreateInstagramOrganicAdapterOptions, "credentialVault">,
): PluginRegistration {
  return {
    manifest: INSTAGRAM_ORGANIC_MANIFEST,
    adapter: createInstagramOrganicAdapter({ credentialVault, ...options }),
  };
}
