import { z } from 'zod';

const requiredText = (label: string, min = 1) =>
  z
    .string({ required_error: `กรุณากรอก${label}` })
    .min(min, `กรุณากรอก${label}`)
    .trim();

export const loginSchema = z.object({
  email: z.string({ required_error: 'กรุณากรอกอีเมล' }).email('อีเมลไม่ถูกต้อง'),
  password: z.string({ required_error: 'กรุณากรอกรหัสผ่าน' }).min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
});

export const registerSchema = z
  .object({
    name: requiredText('ชื่อผู้ใช้งาน', 2),
    email: z.string({ required_error: 'กรุณากรอกอีเมล' }).email('อีเมลไม่ถูกต้อง'),
    password: z.string({ required_error: 'กรุณากรอกรหัสผ่าน' }).min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
    confirmPassword: z.string({ required_error: 'กรุณายืนยันรหัสผ่าน' })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword']
  });

export const metaConnectionSchema = z.object({
  adAccountId: z.string().trim().optional().default(''),
  accessToken: z.string().optional().default(''),
  tokenExpiresAt: z.string().optional(),
  status: z.enum(['CONNECTED', 'DISCONNECTED', 'ERROR']).default('CONNECTED')
});

export const notificationsSchema = z.object({
  emailEnabled: z.boolean().default(false),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFrom: z.string().optional(),
  notifyEmailTo: z.string().optional(),
  lineEnabled: z.boolean().default(false),
  lineMode: z.string().optional(),
  lineToken: z.string().optional()
});

/**
 * ✅ สำคัญ:
 * - ruleSchema เดิมมี .superRefine() ทำให้กลายเป็น ZodEffects -> เรียก .partial() ไม่ได้
 * - วิธีแก้: แยกเป็น ruleBaseSchema (ZodObject) แล้วค่อย export:
 *   - ruleSchema = ruleBaseSchema.superRefine(...)
 *   - ruleUpdateSchema = ruleBaseSchema.partial()
 */
export const ruleBaseSchema = z.object({
  name: requiredText('ชื่อกฎ', 3),
  description: requiredText('คำอธิบาย', 5),
  type: z.enum(['CPA_BUDGET_REDUCTION', 'ROAS_PAUSE_ADSET', 'CTR_FATIGUE_ALERT']),
  autoApply: z.boolean(),
  isEnabled: z.boolean().optional(),
  maxBudgetChangePerDay: z.number().min(1, 'การปรับงบต่อวันต้องไม่น้อยกว่า 1%').max(50, 'การปรับงบต่อวันต้องไม่เกิน 50%'),
  cooldownHours: z.number().min(1, 'คูลดาวน์ต้องไม่น้อยกว่า 1 ชั่วโมง').max(168, 'คูลดาวน์ต้องไม่เกิน 168 ชั่วโมง'),
  configJson: z.record(z.any()),
  scopeType: z.enum(['ACCOUNT', 'CAMPAIGN', 'ADSET']).default('ACCOUNT'),
  scopeIds: z.array(z.string().min(1, 'รหัสเป้าหมายไม่ถูกต้อง')).default([]),
  applyToAll: z.boolean().default(true)
});

export const ruleSchema = ruleBaseSchema.superRefine((data, ctx) => {
  const configSchemaByType = {
    CPA_BUDGET_REDUCTION: z.object({
      cpaCeiling: z.number({ required_error: 'กรุณากรอกเพดาน CPA' }).min(0.01, 'เพดาน CPA ต้องมากกว่า 0'),
      reducePercent: z.number({ required_error: 'กรุณากรอกลดงบ (%)' }).min(1, 'ลดงบต้องไม่น้อยกว่า 1%').max(100, 'ลดงบต้องไม่เกิน 100%'),
      minConversions: z.number({ required_error: 'กรุณากรอกคอนเวอร์ชันขั้นต่ำ' }).int('คอนเวอร์ชันขั้นต่ำต้องเป็นจำนวนเต็ม').min(1, 'คอนเวอร์ชันขั้นต่ำต้องไม่น้อยกว่า 1')
    }),
    ROAS_PAUSE_ADSET: z.object({
      roasFloor: z.number({ required_error: 'กรุณากรอก ROAS ต่ำสุด' }).min(0.01, 'ROAS ต่ำสุดต้องมากกว่า 0'),
      minSpend: z.number({ required_error: 'กรุณากรอกงบขั้นต่ำ' }).min(0.01, 'งบขั้นต่ำต้องมากกว่า 0')
    }),
    CTR_FATIGUE_ALERT: z.object({
      ctrDropPercent: z.number({ required_error: 'กรุณากรอกเปอร์เซ็นต์ CTR ลดลง' }).min(1, 'เปอร์เซ็นต์ CTR ลดลงต้องไม่น้อยกว่า 1%').max(100, 'เปอร์เซ็นต์ CTR ลดลงต้องไม่เกิน 100%'),
      minFrequency: z.number({ required_error: 'กรุณากรอก Frequency ขั้นต่ำ' }).min(1, 'Frequency ขั้นต่ำต้องไม่น้อยกว่า 1')
    })
  } as const;

  const hasType = Boolean(data.type);
  const hasConfig = typeof data.configJson === 'object' && data.configJson !== null;

  if (hasType && !hasConfig) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['configJson'], message: 'กรุณากรอกค่าการตั้งค่ากฎให้ครบถ้วน' });
    return;
  }

  if ((data.scopeType === 'CAMPAIGN' || data.scopeType === 'ADSET') && !data.applyToAll && (data.scopeIds?.length ?? 0) === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scopeIds'],
      message: 'กรุณาเลือกเป้าหมายอย่างน้อย 1 รายการ'
    });
  }

  if (!hasType || !hasConfig) return;

  const parsedConfig = configSchemaByType[data.type].safeParse(data.configJson);
  if (!parsedConfig.success) {
    for (const issue of parsedConfig.error.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: ['configJson', ...issue.path]
      });
    }
  }
});

/**
 * ✅ PATCH ใช้ตัวนี้: อัปเดตแค่บางฟิลด์ได้
 * - ไม่บังคับทุก field
 * - ถ้าส่ง type + configJson มา จะตรวจ (แบบเบา ๆ) ใน route.ts อีกที (เพื่อไม่ซับซ้อนเกิน)
 */
export const ruleUpdateSchema = ruleBaseSchema.partial();

export const userUpdateSchema = z.object({
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional()
});

export const logsFilterSchema = z.object({
  cursor: z.string().optional(),
  eventType: z.string().optional(),
  entityType: z.string().optional(),
  actor: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const usersFilterSchema = z.object({
  query: z.string().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
