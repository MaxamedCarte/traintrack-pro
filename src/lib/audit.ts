import "server-only";
import { AuditLog } from "@/models";
import type { AdminSession } from "./auth";

export async function audit(
  actor: AdminSession | string,
  entry: { action: string; entity: string; entityId?: string; summary?: string; reason?: string; oldValue?: string; newValue?: string },
) {
  await AuditLog.create({ ...entry, actor: typeof actor === "string" ? actor : `${actor.name} <${actor.email}>` });
}
