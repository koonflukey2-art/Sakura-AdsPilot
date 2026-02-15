import { PrismaClient, Role, RuleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_ORGANIZATION_NAME } from '../src/lib/constants';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { name: DEFAULT_ORGANIZATION_NAME },
    update: {},
    create: { name: DEFAULT_ORGANIZATION_NAME }
  });

  const passwordHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.local' },
    update: { organizationId: organization.id, role: Role.ADMIN, isActive: true },
    create: {
      organizationId: organization.id,
      email: 'admin@company.local',
      name: 'ผู้ดูแลระบบ',
      role: Role.ADMIN,
      passwordHash
    }
  });

  await prisma.notificationSetting.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: { organizationId: organization.id }
  });

  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const spend = 1000 + Math.random() * 900;
    const conversions = Math.floor(15 + Math.random() * 25);
    const cpa = spend / conversions;
    const roas = 1.8 + Math.random() * 1.6;
    const ctr = 1 + Math.random() * 2;
    const frequency = 1.5 + Math.random() * 2.5;

    await prisma.metric.create({
      data: {
        organizationId: organization.id,
        date,
        campaignId: 'cmp_001',
        adSetId: 'adset_001',
        spend,
        conversions,
        cpa,
        roas,
        ctr,
        frequency
      }
    });
  }

  const rules = [
    {
      name: 'ควบคุมงบตาม CPA',
      description: 'หาก CPA สูงเกินเพดานและคอนเวอร์ชันถึงขั้นต่ำ ให้ลดงบ',
      type: RuleType.CPA_BUDGET_REDUCTION,
      configJson: { cpaCeiling: 50, minConversions: 20, reducePercent: 15 },
      scopeType: RuleScopeType.ACCOUNT,
      scopeIds: [],
      applyToAll: true
    },
    {
      name: 'หยุดแอดเซ็ตเมื่อ ROAS ต่ำ',
      description: 'หาก ROAS ต่ำต่อเนื่องและมีแนวโน้มแย่ลง ให้หยุดแอดเซ็ต',
      type: RuleType.ROAS_PAUSE_ADSET,
      configJson: { roasFloor: 1.8, minSpend: 300 },
      scopeType: RuleScopeType.ACCOUNT,
      scopeIds: [],
      applyToAll: true
    },
    {
      name: 'แจ้งเตือนครีเอทีฟล้า',
      description: 'แจ้งเตือนเมื่อ CTR ลดลงและ Frequency สูง',
      type: RuleType.CTR_FATIGUE_ALERT,
      configJson: { ctrDropPercent: 20, minFrequency: 2.4 },
      scopeType: RuleScopeType.ACCOUNT,
      scopeIds: [],
      applyToAll: true
    }
  ];

  for (const rule of rules) {
    await prisma.rule.upsert({
      where: { id: `${rule.type}_seed` },
      update: { ...rule, createdById: admin.id, organizationId: organization.id },
      create: { id: `${rule.type}_seed`, ...rule, createdById: admin.id, organizationId: organization.id }
    });
  }

  console.log('Seed complete');
}

main().finally(async () => prisma.$disconnect());
