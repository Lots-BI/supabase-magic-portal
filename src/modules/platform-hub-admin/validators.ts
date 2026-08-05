import { z } from "zod";

export const hubConnectionsFiltersSchema = z.object({
  search: z.string().optional(),
  pluginKey: z.string().optional(),
  health: z.string().optional(),
  provider: z.string().optional(),
  cadastroId: z.coerce.number().optional(),
});

export const createConnectionWizardSchema = z.object({
  cadastroId: z.number().int().positive(),
  pluginKey: z.string().min(1),
  label: z.string().min(1),
  activeProviderType: z.enum(["make_passive", "official_api"]),
});

export const attachIdentitySchema = z.object({
  connectionId: z.string().uuid(),
  identityType: z.string().min(1),
  externalId: z.string().min(1),
  label: z.string().min(1),
  isPrimary: z.boolean().optional(),
});

export const storeCredentialSchema = z.object({
  connectionId: z.string().uuid(),
  credentialKey: z.string().min(1),
  accessToken: z.string().min(1),
});

export const connectionIdSchema = z.object({
  connectionId: z.string().uuid(),
});

export const startOAuthSchema = z.object({
  connectionId: z.string().uuid(),
  redirectAfter: z.string().min(1),
  /** Meta only — pede pages_manage_posts etc. Só após Use Cases no App Dashboard. */
  includePublishScopes: z.boolean().optional(),
});

export const switchProviderSchema = z.object({
  connectionId: z.string().uuid(),
  activeProviderType: z.enum(["make_passive", "official_api"]),
});

export const updateConnectionSchema = z.object({
  connectionId: z.string().uuid(),
  label: z.string().min(1).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const batchAttachIdentitiesSchema = z.object({
  connectionId: z.string().uuid(),
  identities: z.array(
    z.object({
      identityType: z.string().min(1),
      externalId: z.string().min(1),
      label: z.string().min(1),
      isPrimary: z.boolean().optional(),
    }),
  ),
});

export const credentialKeySchema = z.object({
  connectionId: z.string().uuid(),
  credentialKey: z.string().min(1),
});

export const updateMigrationStageSchema = z.object({
  connectionId: z.string().uuid(),
  migrationStage: z.enum([
    "make_passive",
    "parity",
    "dual_run",
    "ready",
    "official_only",
    "make_off",
  ]),
});
