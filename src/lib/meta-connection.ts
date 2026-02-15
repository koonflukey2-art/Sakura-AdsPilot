import { prisma } from './prisma';
import { decrypt } from './crypto';

export type ServerMetaConnection = {
  id: string;
  organizationId: string;
  adAccountId: string;
  accessToken: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  testedAt: Date | null;
};

export async function getMetaConnectionOrThrow(organizationId: string): Promise<ServerMetaConnection> {
  const connection = await prisma.metaConnection.findFirst({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' }
  });

  if (!connection || connection.status !== 'CONNECTED') {
    throw new Error('ยังไม่ได้เชื่อมต่อ Facebook หรือสถานะการเชื่อมต่อไม่พร้อมใช้งาน');
  }

  return {
    id: connection.id,
    organizationId: connection.organizationId,
    adAccountId: connection.adAccountId,
    accessToken: decrypt(connection.accessTokenEnc),
    status: connection.status,
    testedAt: connection.testedAt
  };
}
