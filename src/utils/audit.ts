import { prisma } from '../config/prisma';

export interface AuditLogPayload {
  userId?: string;
  action: string;
  entityName: string;
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export async function recordAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: payload.userId || null,
        action: payload.action,
        entityName: payload.entityName,
        entityId: payload.entityId,
        details: payload.details || undefined,
        ipAddress: payload.ipAddress || null
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // Non-blocking so business transactions do not fail because of secondary audit failure
  }
}
