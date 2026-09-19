/**
 * Generates aesthetic, deterministic background and text colors and initials
 * for avatar placeholders based on a provider or entity name.
 */
export interface AvatarColorPalette {
  bg: string;
  text: string;
  initials: string;
}

const HUES = [
  210, // Blue
  260, // Purple
  280, // Violet
  330, // Pink
  160, // Emerald
  180, // Teal
  35, // Amber
  15, // Orange
  140, // Green
  195, // Cyan
  300, // Magenta
  240, // Indigo
];

export function getAvatarColor(name: string): AvatarColorPalette {
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return {
      bg: 'hsl(210, 50%, 40%)',
      text: '#ffffff',
      initials: '?',
    };
  }

  let hash = 0;
  for (let i = 0; i < cleanName.length; i += 1) {
    hash = (hash * 31 + cleanName.charCodeAt(i)) | 0;
  }
  const positiveHash = Math.abs(hash);
  const hue = HUES[positiveHash % HUES.length];

  const trimmed = cleanName.replace(/^[^\p{L}\p{N}]+/u, '');
  const chars = Array.from(trimmed);
  let initials = chars[0] || cleanName[0] || '?';
  if (/^[A-Za-z0-9]$/.test(initials) && chars.length > 1 && /^[A-Za-z0-9]$/.test(chars[1])) {
    initials = (chars[0] + chars[1]).toUpperCase();
  } else {
    initials = initials.toUpperCase();
  }

  return {
    bg: `hsl(${hue}, 60%, 42%)`,
    text: '#ffffff',
    initials,
  };
}
