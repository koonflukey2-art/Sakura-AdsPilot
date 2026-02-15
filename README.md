# Sakura AdsPilot (Thai-first, Single Organization)

ระบบจัดการโฆษณาแบบ Next.js App Router + Prisma + PostgreSQL + NextAuth

## คุณสมบัติหลัก
- รองรับบทบาท 2 แบบ: `ADMIN`, `EMPLOYEE`
- ผู้ใช้ทุกคนอยู่ในองค์กรเดียวกัน (ค่าเริ่มต้น `Sakura AdsPilot`)
- สมัครสมาชิก/เข้าสู่ระบบแยกหน้า (`/register`, `/login`)
- หน้า Dashboard KPI, Rules, Logs, Settings, Users (เฉพาะแอดมิน)
- การตั้งค่าแจ้งเตือนและ Meta connection เก็บลง DB พร้อมเข้ารหัสข้อมูลลับ
- Audit Log ครอบคลุมการแก้ไขข้อมูลหลัก
- Worker มี lock กันรันซ้ำ

## เริ่มใช้งานในองค์กร (Local)
```bash
cp .env.example .env
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

บัญชีเริ่มต้น: `admin@company.local / Admin@12345`

## ลำดับใช้งาน MVP
1. สมัครสมาชิกพนักงานที่ `/register`
2. เข้าสู่ระบบที่ `/login`
3. ไปหน้า `/settings` เพื่อบันทึก Meta API และทดสอบการเชื่อมต่อ
4. ไปหน้า `/rules` เพื่อเลือกขอบเขตแคมเปญ/แอดเซ็ต แล้วสร้างกฎ
5. (แอดมิน) สั่งรันกฎตอนนี้จาก API `/api/worker/run`
6. ตรวจสอบผลใน `/logs` และ KPI ที่ `/dashboard`

## Docker Compose
```bash
docker compose up --build -d
```

## หมายเหตุ Production
- ใช้ `prisma migrate deploy` (ไม่ใช้ db push ตอน runtime)
- ตั้งค่า `NEXTAUTH_SECRET` และ `FIELD_ENCRYPTION_KEY` ให้ปลอดภัย
- API จะไม่คืนค่า secret ดิบออกไป
