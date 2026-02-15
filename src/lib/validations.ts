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
  metaAdAccountId: requiredText('รหัสบัญชีโฆษณา Meta', 3),
  accessToken: z.string().optional(),
  tokenExpiresAt: z.string().optional(),
  isActive: z.boolean().default(true)
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

export const ruleSchema = z.object({
  name: requiredText('ชื่อกฎ', 3),
  description: requiredText('คำอธิบาย', 5),
  type: z.enum(['CPA_BUDGET_REDUCTION', 'ROAS_PAUSE_ADSET', 'CTR_FATIGUE_ALERT']),
  autoApply: z.boolean(),
  isEnabled: z.boolean().optional(),
  maxBudgetChangePerDay: z.number().min(1, 'การปรับงบต่อวันต้องไม่น้อยกว่า 1%').max(50, 'การปรับงบต่อวันต้องไม่เกิน 50%'),
  cooldownHours: z.number().min(1, 'คูลดาวน์ต้องไม่น้อยกว่า 1 ชั่วโมง').max(168, 'คูลดาวน์ต้องไม่เกิน 168 ชั่วโมง'),
  configJson: z.record(z.any())
});

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
