FROM node:20-alpine AS base
WORKDIR /app

# ✅ ทำให้ npm ใน container เท่ากับเครื่อง (แก้ปัญหา lock mismatch)
RUN npm i -g npm@11.10.0

COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm","run","start"]
