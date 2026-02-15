export function maskSecret(value?: string | null) {
  if (!value) return '';
  if (value.length <= 6) return '******';
  return `${value.slice(0, 4)}...${value.slice(-3)}`;
}
