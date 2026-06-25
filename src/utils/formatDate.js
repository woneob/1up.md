export function formatDate(dateStr, { short = false } = {}) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: short ? 'short' : 'long',
    day: 'numeric'
  });
}
