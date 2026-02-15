import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const metaConnectionSchema = z.object({
  metaAdAccountId: z.string().min(3),
  accessToken: z.string().min(20),
  tokenExpiresAt: z.string().optional()
});

export const ruleSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(5),
  type: z.enum(['CPA_BUDGET_REDUCTION', 'ROAS_PAUSE_ADSET', 'CTR_FATIGUE_ALERT']),
  autoApply: z.boolean(),
  maxBudgetChangePerDay: z.number().min(1).max(50),
  cooldownHours: z.number().min(1).max(168),
  configJson: z.record(z.any())
});
