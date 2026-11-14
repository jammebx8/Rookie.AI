import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge taught the Dropper tokens, so `text-body` (a font size) doesn't get mistaken for a
 * text colour and dropped next to `text-fg`, and `rounded-card` / `shadow-hover` merge correctly.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['price', 'display', 'value', 'heading', 'title', 'body-lg', 'body', 'body-sm', 'label', 'meta', 'caption'] }],
      rounded: [{ rounded: ['tag', 'control', 'card', 'round'] }],
      shadow: [{ shadow: ['hover', 'raised', 'float', 'sale'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
