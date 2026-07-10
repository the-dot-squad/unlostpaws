import { requireStaff } from "@/lib/auth/session";
import { getInfrastructureStats } from "@/lib/repositories/admin-stats";
import { formatBytes } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { ServiceStatusGrid } from "@/components/admin/infrastructure/service-status-grid";
import { MongoStorageTable } from "@/components/admin/infrastructure/mongo-storage-table";
import { QdrantStorageTable } from "@/components/admin/infrastructure/qdrant-storage-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROCESSING_STATUSES } from "@/config/constants/enums";
import {
  Database,
  Layers,
  Server,
  HardDrive,
  Workflow,
  Sparkles,
  Settings2,
} from "lucide-react";

export default async function AdminStatsPage() {
  await requireStaff();
  const stats = await getInfrastructureStats();

  const { database, qdrant, redis, processing, embeddings, environment, services } = stats;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Infrastructure stats"
        description="Database footprint, ML pipeline health, and service connectivity. Refreshed on each page load."
      />

      {/* Live connectivity probes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Service health
        </h2>
        <ServiceStatusGrid services={services} />
      </section>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title="MongoDB documents"
          value={database.totalDocuments.toLocaleString()}
          subtitle={`${formatBytes(database.totalStorage)} on disk · ${database.totalIndexes} indexes`}
          icon={Database}
        />
        <AdminStatCard
          title="Vector points"
          value={qdrant.configured && !qdrant.error ? qdrant.totalPoints.toLocaleString() : "—"}
          subtitle={
            qdrant.configured
              ? qdrant.error
                ? "Qdrant unreachable"
                : `${qdrant.totalVectors.toLocaleString()} vectors`
              : "Not configured"
          }
          icon={Layers}
        />
        <AdminStatCard
          title="ML queue depth"
          value={redis.connected ? redis.queue.length.toLocaleString() : "—"}
          subtitle={
            redis.configured
              ? redis.connected
                ? `${redis.dlq.length} in DLQ · ${redis.consumerGroup?.pending ?? 0} pending`
                : "Redis unreachable"
              : "Not configured"
          }
          icon={Workflow}
        />
        <AdminStatCard
          title="Embedding coverage"
          value={`${embeddings.listingImages.coveragePct}%`}
          subtitle={`${embeddings.listingImages.embedded}/${embeddings.listingImages.total} listing images`}
          icon={Sparkles}
        />
      </div>

      {/* MongoDB */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">MongoDB storage</CardTitle>
              <CardDescription>
                {database.totalDocuments.toLocaleString()} documents ·{" "}
                {formatBytes(database.totalDataSize)} data · {formatBytes(database.totalStorage)} allocated
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MongoStorageTable collections={database.collections} />
        </CardContent>
      </Card>

      {/* Qdrant */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Qdrant vector database</CardTitle>
              <CardDescription>
                {qdrant.configured ? (
                  qdrant.error ? (
                    "Configured but unreachable — check QDRANT_URL"
                  ) : (
                    <>
                      {qdrant.totalPoints.toLocaleString()} points ·{" "}
                      {qdrant.totalVectors.toLocaleString()} vectors · {environment.qdrant.vectorSize} dims
                    </>
                  )
                ) : (
                  "Not configured — set QDRANT_URL to enable ML embeddings"
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {qdrant.configured && !qdrant.error ? (
          <CardContent>
            <QdrantStorageTable collections={qdrant.collections} />
          </CardContent>
        ) : null}
      </Card>

      {/* Redis ML queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Redis ML job queue</CardTitle>
              <CardDescription>
                {redis.configured
                  ? redis.connected
                    ? "Vision processing stream consumed by the vision-worker"
                    : `Configured but unreachable${redis.error ? ` — ${redis.error}` : ""}`
                  : "Not configured — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {redis.configured && redis.connected ? (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Main queue</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{redis.queue.length}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{redis.queue.stream}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Dead letter queue</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{redis.dlq.length}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{redis.dlq.stream}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Consumer group</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {redis.consumerGroup?.exists ? redis.consumerGroup.consumers : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {redis.consumerGroup?.exists
                    ? `${redis.consumerGroup.pending} pending · ${redis.consumerGroup.name}`
                    : "Group not created yet"}
                </p>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {/* ML processing pipeline */}
      <Card id="processing">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Workflow className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">ML processing pipeline</CardTitle>
              <CardDescription>
                Documents by processingStatus — failed items need investigation or reprocessing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium">Listings</h3>
            <div className="space-y-2">
              {PROCESSING_STATUSES.map((status) => (
                <div key={status} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="capitalize text-sm">{status}</span>
                  <span className="font-semibold tabular-nums">{processing.listings[status]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Registered pets</h3>
            <div className="space-y-2">
              {PROCESSING_STATUSES.map((status) => (
                <div key={status} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="capitalize text-sm">{status}</span>
                  <span className="font-semibold tabular-nums">{processing.ownedPets[status]}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedding coverage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Embedding coverage</CardTitle>
              <CardDescription>
                How much of the image corpus has been vectorized for similarity search
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Listing images</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{embeddings.listingImages.coveragePct}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {embeddings.listingImages.embedded.toLocaleString()} of{" "}
              {embeddings.listingImages.total.toLocaleString()} embedded
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Active registered pets</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{embeddings.ownedPets.coveragePct}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {embeddings.ownedPets.embedded.toLocaleString()} of{" "}
              {embeddings.ownedPets.total.toLocaleString()} embedded
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environment snapshot */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Environment</CardTitle>
              <CardDescription>
                Non-sensitive deployment configuration — no secrets shown
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <EnvItem label="Node environment" value={environment.nodeEnv} />
            <EnvItem label="App URL" value={environment.appUrl} mono />
            <EnvItem label="Database" value={environment.dbName} mono />
            <EnvItem
              label="Object storage"
              value={
                environment.storage.publicViaS3
                  ? `S3 · ${environment.storage.bucket}`
                  : environment.storage.hasBackend
                    ? `Local proxy · ${environment.storage.bucket}`
                    : "Local filesystem"
              }
            />
            <EnvItem label="Email provider" value={environment.email.provider} />
            <EnvItem
              label="OAuth providers"
              value={[
                environment.auth.google && "Google",
                environment.auth.facebook && "Facebook",
                environment.auth.twitter && "Twitter",
              ]
                .filter(Boolean)
                .join(", ") || "None"}
            />
            <EnvItem label="Turnstile" value={environment.turnstile.configured ? "Enabled" : "Disabled"} />
            <EnvItem label="Redis" value={environment.redis.configured ? "Configured" : "Not set"} />
            <EnvItem
              label="Qdrant"
              value={
                environment.qdrant.configured
                  ? `Configured · ${environment.qdrant.vectorSize} dims`
                  : "Not set"
              }
            />
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <HardDrive className="size-3.5" />
            Snapshot generated {new Date(stats.generatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function EnvItem({ label, value, mono = false }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <Badge variant="secondary" className={mono ? "font-mono text-xs font-normal" : ""}>
          {value}
        </Badge>
      </div>
    </div>
  );
}
