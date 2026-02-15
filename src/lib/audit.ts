import { prisma } from './prisma';

type AuditInput = {
  organizationId: string;
  actorId?: string;
  actorLabel: string;
  actorType?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
};

export async function createAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorType: input.actorType ?? 'USER',
      actorId: input.actorId,
      actorLabel: input.actorLabel,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      detailsJson: input.details ?? {}
    }
  });
}
