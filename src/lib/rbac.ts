import { Role } from '@prisma/client';

export function isAdmin(role?: Role) {
  return role === 'ADMIN';
}

export function canManageUsers(role?: Role) {
  return role === 'ADMIN';
}

export function canManageRules(role?: Role) {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}
