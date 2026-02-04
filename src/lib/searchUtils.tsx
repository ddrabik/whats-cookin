import Fuse from 'fuse.js';
import type { Recipe } from '~/types/recipe';

export const createRecipeSearch = (recipes: Array<Recipe>) => {
  return new Fuse(recipes, {
    keys: [
      { name: 'title', weight: 2 },              // Prioritize title matches
      { name: 'ingredients.name', weight: 1.5 }, // Then ingredient names (nested field)
      { name: 'mealType', weight: 1 }            // Then category
    ],
    threshold: 0.25,             // Stricter: allows small typos but not random matches
    distance: 100,               // Limit search distance
    minMatchCharLength: 3,       // Require at least 3 consecutive matching characters
    ignoreLocation: true,        // Match anywhere in string
    includeMatches: true,        // Return match positions for highlighting
    findAllMatches: true         // Find all occurrences
  });
};

export const HighlightedText: React.FC<{
  text: string;
  indices: ReadonlyArray<[number, number]>;
}> = ({ text, indices }) => {
  if (indices.length === 0) {
    return <>{text}</>;
  }

  const parts: Array<React.ReactNode> = [];
  let lastIndex = 0;

  indices.forEach(([start, end], i) => {
    // Add non-highlighted text before match
    if (start > lastIndex) {
      parts.push(text.substring(lastIndex, start));
    }
    // Add highlighted match
    parts.push(
      <mark
        key={i}
        className="bg-lime-200 text-lime-900 dark:bg-lime-900/50 dark:text-lime-200 rounded px-0.5"
      >
        {text.substring(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};

export const extractMatchContext = (
  text: string,
  matches: ReadonlyArray<[number, number]>,
  contextChars = 30
): { before: string; matched: string; after: string } | null => {
  if (matches.length === 0) return null;

  const [start, end] = matches[0]; // Use first match
  const matched = text.substring(start, end + 1);

  const beforeStart = Math.max(0, start - contextChars);
  const before = (beforeStart > 0 ? '...' : '') + text.substring(beforeStart, start);

  const afterEnd = Math.min(text.length, end + 1 + contextChars);
  const after = text.substring(end + 1, afterEnd) + (afterEnd < text.length ? '...' : '');

  return { before, matched, after };
};
