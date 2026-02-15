import { PrismaClient, Role, RuleType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.local' },
    update: {},
    create: {
      email: 'admin@company.local',
      name: 'System Admin',
      role: Role.ADMIN,
      passwordHash
    }
  });

  await prisma.notificationSetting.upsert({
    where: { id: 'default-notification-settings' },
    update: {},
    create: { id: 'default-notification-settings' }
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
      name: 'CPA Ceiling Budget Guard',
      description: 'If CPA is too high and conversions are sufficient, reduce budget.',
      type: RuleType.CPA_BUDGET_REDUCTION,
      configJson: { cpaCeiling: 50, minConversions: 20, reduceByPercent: 15 }
    },
    {
      name: 'ROAS Sliding Stop',
      description: 'If ROAS stays low for consecutive days and trend worsens, pause ad set.',
      type: RuleType.ROAS_PAUSE_ADSET,
      configJson: { roasTarget: 1.8, consecutiveDays: 3 }
    },
    {
      name: 'Creative Fatigue Alert',
      description: 'Alert when CTR drops while frequency remains high.',
      type: RuleType.CTR_FATIGUE_ALERT,
      configJson: { ctrDropPercent: 20, minFrequency: 2.4 }
    }
  ];

  for (const rule of rules) {
    await prisma.rule.upsert({
      where: { id: `${rule.type}_seed` },
      update: { ...rule, createdById: admin.id },
      create: { id: `${rule.type}_seed`, ...rule, createdById: admin.id }
    });
  }

  console.log('Seed complete');
}

main().finally(async () => prisma.$disconnect());
