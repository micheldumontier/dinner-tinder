// Pure recipe-filtering logic for the lobby.
//
// The host can narrow the deck by cuisine (area), category, and a vegetarian
// constraint before the party starts swiping. Keeping this pure and separate
// from the UI means it's trivially unit-testable, and a real backend could
// apply the very same `RecipeFilters` server-side without any UI change.

import type { Recipe } from "../api/types";

export interface RecipeFilters {
  /** Keep only these categories (e.g. "Chicken", "Pasta"). Empty = no constraint. */
  categories: string[];
  /** Keep only these cuisines / areas (e.g. "Italian"). Empty = no constraint. */
  areas: string[];
  /** Keep only meat-free recipes (category Vegetarian or Vegan). */
  vegetarianOnly: boolean;
}

/** Categories considered meat-free for the vegetarian constraint. */
const VEGETARIAN_CATEGORIES = new Set(["Vegetarian", "Vegan"]);

export const EMPTY_FILTERS: RecipeFilters = {
  categories: [],
  areas: [],
  vegetarianOnly: false,
};

/** Are any constraints actually active? */
export function hasActiveFilters(filters: RecipeFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.areas.length > 0 ||
    filters.vegetarianOnly
  );
}

/** The set of recipes that satisfy every active constraint, in original order. */
export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const categories = new Set(filters.categories);
  const areas = new Set(filters.areas);

  return recipes.filter((recipe) => {
    if (categories.size > 0 && !categories.has(recipe.category)) return false;
    if (areas.size > 0 && !areas.has(recipe.area)) return false;
    if (filters.vegetarianOnly && !VEGETARIAN_CATEGORIES.has(recipe.category)) {
      return false;
    }
    return true;
  });
}

/** The distinct categories and areas present in a deck, each sorted A→Z. */
export function availableFilterOptions(recipes: Recipe[]): {
  categories: string[];
  areas: string[];
} {
  const categories = new Set<string>();
  const areas = new Set<string>();
  for (const recipe of recipes) {
    categories.add(recipe.category);
    areas.add(recipe.area);
  }
  return {
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    areas: [...areas].sort((a, b) => a.localeCompare(b)),
  };
}
