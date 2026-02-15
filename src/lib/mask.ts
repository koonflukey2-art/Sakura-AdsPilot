export function maskSecret(value?: string | null) {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

export function maskMiddle(value?: string | null) {
  if (!value) return '';
  if (value.length <= 6) return `${value.slice(0, 1)}***${value.slice(-1)}`;
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}
