import { describe, expect, it } from "vitest";
import type { Recipe } from "../api/types";
import {
  EMPTY_FILTERS,
  availableFilterOptions,
  filterRecipes,
  hasActiveFilters,
} from "./filters";

function recipe(id: string, category: string, area: string): Recipe {
  return {
    id,
    name: id,
    category,
    area,
    thumbnail: "",
    instructions: "",
    ingredients: [],
  };
}

const DECK: Recipe[] = [
  recipe("r1", "Chicken", "Japanese"),
  recipe("r2", "Pasta", "Italian"),
  recipe("r3", "Vegetarian", "Indian"),
  recipe("r4", "Beef", "British"),
  recipe("r5", "Vegan", "Italian"),
];

describe("filterRecipes", () => {
  it("returns the whole deck when no filters are active", () => {
    expect(filterRecipes(DECK, EMPTY_FILTERS)).toHaveLength(DECK.length);
  });

  it("filters by a single category", () => {
    const result = filterRecipes(DECK, { ...EMPTY_FILTERS, categories: ["Pasta"] });
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("treats multiple categories as a union", () => {
    const result = filterRecipes(DECK, {
      ...EMPTY_FILTERS,
      categories: ["Chicken", "Beef"],
    });
    expect(result.map((r) => r.id)).toEqual(["r1", "r4"]);
  });

  it("filters by area", () => {
    const result = filterRecipes(DECK, { ...EMPTY_FILTERS, areas: ["Italian"] });
    expect(result.map((r) => r.id)).toEqual(["r2", "r5"]);
  });

  it("combines category and area as an intersection", () => {
    const result = filterRecipes(DECK, {
      ...EMPTY_FILTERS,
      categories: ["Vegan"],
      areas: ["Italian"],
    });
    expect(result.map((r) => r.id)).toEqual(["r5"]);
  });

  it("keeps only vegetarian/vegan when vegetarianOnly is set", () => {
    const result = filterRecipes(DECK, { ...EMPTY_FILTERS, vegetarianOnly: true });
    expect(result.map((r) => r.id)).toEqual(["r3", "r5"]);
  });

  it("preserves the original deck order", () => {
    const result = filterRecipes(DECK, { ...EMPTY_FILTERS, areas: ["Italian", "Japanese"] });
    expect(result.map((r) => r.id)).toEqual(["r1", "r2", "r5"]);
  });

  it("can collapse to an empty set", () => {
    const result = filterRecipes(DECK, { ...EMPTY_FILTERS, categories: ["Dessert"] });
    expect(result).toEqual([]);
  });
});

describe("hasActiveFilters", () => {
  it("is false for empty filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("is true when any constraint is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, categories: ["Beef"] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, areas: ["Italian"] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, vegetarianOnly: true })).toBe(true);
  });
});

describe("availableFilterOptions", () => {
  it("returns sorted, de-duplicated categories and areas", () => {
    const { categories, areas } = availableFilterOptions(DECK);
    expect(categories).toEqual(["Beef", "Chicken", "Pasta", "Vegan", "Vegetarian"]);
    expect(areas).toEqual(["British", "Indian", "Italian", "Japanese"]);
  });
});
