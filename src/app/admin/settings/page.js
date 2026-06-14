import { requireAdmin } from "@/lib/auth/session";
import { connectDB } from "@/config/db";
import { getAppSettings } from "@/lib/services/settings";
import { getRateLimitDisplayConfig } from "@/config/env";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSettingsForm } from "@/components/admin/settings-form";
import { toPlainObject } from "@/lib/utils";

export default async function AdminSettingsPage() {
  await requireAdmin();
  await connectDB();
  const settings = await getAppSettings();
  const rateLimitEnv = getRateLimitDisplayConfig();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Platform configuration — rate limits, ML matching, and moderation thresholds."
      />
      <AdminSettingsForm
        settings={toPlainObject(settings)}
        rateLimitEnv={rateLimitEnv}
      />
    </div>
  );
}
