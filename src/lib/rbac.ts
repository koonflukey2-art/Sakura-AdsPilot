import { Role } from '@prisma/client';

export const roleWeight: Record<Role, number> = {
  VIEWER: 1,
  MARKETER: 2,
  ADMIN: 3
};

export function hasRole(userRole: Role, required: Role) {
  return roleWeight[userRole] >= roleWeight[required];
}
