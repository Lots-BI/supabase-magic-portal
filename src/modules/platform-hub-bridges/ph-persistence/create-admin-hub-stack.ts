import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { asScopeRef } from "../../../../contracts/connection/scope-ref.v1";
import { createLegacyCadastroBridge } from "@/modules/platform-hub-bridges/legacy-cadastro";
import { registerCadastroRecord } from "@/modules/platform-hub-bridges/legacy-cadastro";
import { createConnectionResolver } from "@/modules/platform-hub/connections/create-connection-resolver";
import { ConnectionService } from "@/modules/platform-hub/connections/connection-service";
import { IdentityService } from "@/modules/platform-hub/identity/identity-service";
import { createHealthStack } from "@/modules/platform-hub/health/create-health-stack";
import { createHomologationHubWriter } from "@/modules/platform-hub-bridges/base-metricas";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { createObservabilityStack } from "@/modules/platform-hub/observability/create-observability-stack";
import { createHubRegistryWithCredentials } from "@/modules/platform-hub/registry/create-hub-registry-with-credentials";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import type {
  HttpClientPort,
  HttpRequestInitV1,
} from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import { withHttpRetry } from "@/modules/platform-hub/plugins/_internal/http/retry-http";
import { InMemoryRuntimeRepository } from "@/modules/platform-hub/runtime/repositories/in-memory-runtime.repository";
import {
  RetryExecutor,
  SimpleRetryPolicy,
} from "@/modules/platform-hub/runtime/retry/retry-executor";
import { InMemoryRuntimeMetrics } from "@/modules/platform-hub/runtime/metrics/in-memory-runtime-metrics";
import { SyncRuntime } from "@/modules/platform-hub/runtime/sync-runtime";
import { ManualScheduler } from "@/modules/platform-hub/runtime/manual-scheduler";
import { SyncOrchestrator } from "@/modules/platform-hub/runtime/sync-orchestrator";
import { SupabaseConnectionRepository } from "./repositories/supabase-connection.repository";
import { SupabaseIdentityRepository } from "./repositories/supabase-identity.repository";
import { SupabaseCredentialVault } from "./repositories/supabase-credential-vault";
import { SupabaseSyncRunRepository } from "./repositories/supabase-sync-run.repository";
import { PhTimelineRepository } from "./repositories/ph-timeline.repository";
import { PhOAuthStateRepository } from "./repositories/ph-oauth-state.repository";
import { PhAdminQueryRepository } from "./repositories/ph-admin-query.repository";

function createLiveHttpClient(): HttpClientPort {
  const client = new FetchHttpClient();
  return {
    request(url: string, init?: HttpRequestInitV1) {
      return withHttpRetry(() => client.request(url, init));
    },
  };
}

async function hydrateCadastroBridge(
  supabase: SupabaseClient,
  bridge: ReturnType<typeof createLegacyCadastroBridge>,
): Promise<void> {
  const { data } = await supabase
    .from("ph_connections")
    .select("id,scope_ref,cadastro_clientes(nome_cliente)");

  for (const row of data ?? []) {
    const id = row.id as string | undefined;
    const scopeRaw = row.scope_ref as string | undefined;
    if (!id || !scopeRaw) continue;

    const scopeRef = asScopeRef(scopeRaw);
    bridge.registerConnection(asConnectionId(id), scopeRef);

    const match = /^cadastro:(\d+)$/.exec(scopeRaw);
    const nome = (row.cadastro_clientes as { nome_cliente?: string } | null)?.nome_cliente;
    if (match && nome) {
      registerCadastroRecord({ cadastroId: Number(match[1]), nomeCanonico: nome });
    }
  }
}

/** Composition root admin — persiste em ph_* e orquestra kernel congelado. */
export async function createAdminHubStack(supabase: SupabaseClient) {
  const connectionRepository = new SupabaseConnectionRepository(supabase);
  const identityRepository = new SupabaseIdentityRepository(supabase);
  const credentialVault = new SupabaseCredentialVault(supabase);
  const bridge = createLegacyCadastroBridge();
  await hydrateCadastroBridge(supabase, bridge);

  const registry = createHubRegistryWithCredentials(credentialVault, {
    httpClient: createLiveHttpClient(),
  });

  const connectionService = new ConnectionService(connectionRepository, registry, bridge);
  const identityService = new IdentityService(identityRepository, connectionRepository, registry);
  const resolver = createConnectionResolver(bridge);
  const healthStack = createHealthStack();
  const pipelineStack = createMetricPipelineStack({
    writerMode: "both",
    supabaseWriter: createHomologationHubWriter(),
    supabaseWriterEnabled: true,
  });

  const syncRunRepository = new SupabaseSyncRunRepository(supabase);

  const observabilityStack = createObservabilityStack({ syncRunRepository });

  const orchestrator = new SyncOrchestrator(connectionService, identityService, resolver);
  const runtimeRepository = new InMemoryRuntimeRepository();
  const runtimeMetrics = new InMemoryRuntimeMetrics();
  const retryExecutor = new RetryExecutor();
  const retryPolicy = new SimpleRetryPolicy(3);

  const syncRuntime = new SyncRuntime(
    connectionService,
    orchestrator,
    healthStack.healthEngine,
    runtimeRepository,
    retryExecutor,
    retryPolicy,
    runtimeMetrics,
    observabilityStack.eventBus,
    observabilityStack.observability,
    observabilityStack.syncRunRepository,
  );

  const manualScheduler = new ManualScheduler(syncRuntime);
  const timeline = new PhTimelineRepository(supabase);
  const oauthStates = new PhOAuthStateRepository(supabase);
  const adminQueries = new PhAdminQueryRepository(supabase);

  return {
    registry,
    bridge,
    connectionService,
    identityService,
    credentialVault,
    resolver,
    syncRuntime,
    manualScheduler,
    metricPipeline: pipelineStack.metricPipeline,
    writer: pipelineStack.writer,
    healthEngine: healthStack.healthEngine,
    timeline,
    oauthStates,
    adminQueries,
    syncRunRepository,
  };
}

export type AdminHubStack = Awaited<ReturnType<typeof createAdminHubStack>>;
