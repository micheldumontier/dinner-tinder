// Mock of an external recipe API (shaped like TheMealDB).
//
// Swap this module for a real `fetch("https://www.themealdb.com/...")` call
// later — the rest of the app only depends on `fetchRecipes(): Promise<Recipe[]>`
// and the `Recipe` shape, so nothing else needs to change.

import type { Recipe } from "./types";

const MEALDB_IMG = "https://www.themealdb.com/images/media/meals";

// A curated deck. Image URLs are real TheMealDB CDN assets; the UI degrades
// gracefully to a coloured gradient if an image fails to load (offline mode).
const RECIPES: Recipe[] = [
  {
    id: "52772",
    name: "Teriyaki Chicken Casserole",
    category: "Chicken",
    area: "Japanese",
    thumbnail: `${MEALDB_IMG}/wvpsxx1468256321.jpg`,
    instructions:
      "Preheat oven to 350°F. Whisk soy sauce, brown sugar, ginger and garlic. Simmer to thicken, toss with baked chicken and steamed veg over rice.",
    ingredients: ["Chicken", "Soy sauce", "Brown sugar", "Ginger", "Garlic", "Broccoli", "Rice"],
    sourceUrl: "https://www.themealdb.com/meal/52772",
  },
  {
    id: "52844",
    name: "Lasagne",
    category: "Pasta",
    area: "Italian",
    thumbnail: `${MEALDB_IMG}/wtsvxx1511296896.jpg`,
    instructions:
      "Brown beef with onion and garlic, add tomato. Layer with pasta sheets and béchamel, top with cheese, bake until golden.",
    ingredients: ["Beef", "Onion", "Garlic", "Tomato", "Pasta sheets", "Béchamel", "Parmesan"],
    sourceUrl: "https://www.themealdb.com/meal/52844",
  },
  {
    id: "52977",
    name: "Corba (Lentil Soup)",
    category: "Soup",
    area: "Turkish",
    thumbnail: `${MEALDB_IMG}/58oia61564916529.jpg`,
    instructions:
      "Sauté onion and pepper, add red lentils, rice and stock. Simmer, blend smooth, finish with paprika butter and lemon.",
    ingredients: ["Red lentils", "Onion", "Carrot", "Rice", "Vegetable stock", "Paprika", "Lemon"],
    sourceUrl: "https://www.themealdb.com/meal/52977",
  },
  {
    id: "52940",
    name: "Brown Stew Chicken",
    category: "Chicken",
    area: "Jamaican",
    thumbnail: `${MEALDB_IMG}/sypxpx1515365095.jpg`,
    instructions:
      "Marinate chicken in spices, sear, then braise with peppers, thyme and tomato until tender and saucy.",
    ingredients: ["Chicken", "Tomato", "Onion", "Scotch bonnet", "Thyme", "Allspice", "Lime"],
    sourceUrl: "https://www.themealdb.com/meal/52940",
  },
  {
    id: "52874",
    name: "Beef and Mustard Pie",
    category: "Beef",
    area: "British",
    thumbnail: `${MEALDB_IMG}/sytuqu1511553755.jpg`,
    instructions:
      "Slow-cook beef in stock and mustard until fork-tender, fill a dish, top with puff pastry and bake until risen and golden.",
    ingredients: ["Beef", "Mustard", "Beef stock", "Flour", "Puff pastry", "Onion"],
    sourceUrl: "https://www.themealdb.com/meal/52874",
  },
  {
    id: "52819",
    name: "Cajun Spiced Salmon",
    category: "Seafood",
    area: "American",
    thumbnail: `${MEALDB_IMG}/adxcbq1619787919.jpg`,
    instructions:
      "Rub salmon with cajun spice, sear skin-side down, finish in the oven. Serve with lime and a crisp salad.",
    ingredients: ["Salmon", "Cajun spice", "Olive oil", "Lime", "Salad greens"],
    sourceUrl: "https://www.themealdb.com/meal/52819",
  },
  {
    id: "52795",
    name: "Chicken Handi",
    category: "Chicken",
    area: "Indian",
    thumbnail: `${MEALDB_IMG}/wyxwsp1486979827.jpg`,
    instructions:
      "Cook chicken with onion, tomato, yoghurt and warming spices until rich. Finish with cream and coriander.",
    ingredients: ["Chicken", "Yoghurt", "Tomato", "Onion", "Garam masala", "Cream", "Coriander"],
    sourceUrl: "https://www.themealdb.com/meal/52795",
  },
  {
    id: "52771",
    name: "Spicy Arrabiata Penne",
    category: "Pasta",
    area: "Italian",
    thumbnail: `${MEALDB_IMG}/ustsqw1468250014.jpg`,
    instructions:
      "Simmer garlic, chilli and tomato into a punchy sauce, toss with penne and basil, shower with pecorino.",
    ingredients: ["Penne", "Tomato", "Garlic", "Chilli flakes", "Olive oil", "Basil", "Pecorino"],
    sourceUrl: "https://www.themealdb.com/meal/52771",
  },
  {
    id: "52785",
    name: "Dal Fry",
    category: "Vegetarian",
    area: "Indian",
    thumbnail: `${MEALDB_IMG}/wuxrtu1483564410.jpg`,
    instructions:
      "Boil lentils soft, then temper cumin, garlic, chilli and tomato in ghee and fold through. Serve with rice.",
    ingredients: ["Lentils", "Cumin", "Garlic", "Tomato", "Turmeric", "Ghee", "Coriander"],
    sourceUrl: "https://www.themealdb.com/meal/52785",
  },
  {
    id: "53013",
    name: "Big Mac Smash Burger",
    category: "Beef",
    area: "American",
    thumbnail: `${MEALDB_IMG}/urzj1d1587670726.jpg`,
    instructions:
      "Smash beef balls on a screaming-hot pan, stack with cheese, pickles, shredded lettuce and special sauce in a toasted bun.",
    ingredients: ["Beef mince", "Burger buns", "Cheese", "Pickles", "Lettuce", "Special sauce"],
    sourceUrl: "https://www.themealdb.com/meal/53013",
  },
  {
    id: "52800",
    name: "Mushroom & Spinach Risotto",
    category: "Vegetarian",
    area: "Italian",
    thumbnail: `${MEALDB_IMG}/xrrwpx1487347049.jpg`,
    instructions:
      "Toast arborio rice, ladle in stock while stirring, fold in sautéed mushrooms and spinach, finish with butter and parmesan.",
    ingredients: ["Arborio rice", "Mushrooms", "Spinach", "Onion", "White wine", "Parmesan", "Butter"],
    sourceUrl: "https://www.themealdb.com/meal/52800",
  },
  {
    id: "52793",
    name: "Pad See Ew",
    category: "Noodles",
    area: "Thai",
    thumbnail: `${MEALDB_IMG}/uuuspp1468263334.jpg`,
    instructions:
      "Stir-fry wide rice noodles in a hot wok with chicken, egg, gai lan and a sweet-savoury soy glaze.",
    ingredients: ["Rice noodles", "Chicken", "Egg", "Gai lan", "Dark soy", "Oyster sauce", "Garlic"],
    sourceUrl: "https://www.themealdb.com/meal/52946",
  },
];

/** Simulated network latency so the UI behaves like it talks to a real API. */
const LATENCY_MS = 350;

/**
 * Fetch the preloaded recipe deck.
 *
 * Replace the body with a real call (e.g. TheMealDB `randomselection.php` or a
 * `filter.php?c=` category query) when wiring up a live backend.
 */
export async function fetchRecipes(): Promise<Recipe[]> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  return RECIPES.map((r) => ({ ...r }));
}

/** Lookup helper used by the UI to render a recipe by id. */
export function indexRecipes(recipes: Recipe[]): Map<string, Recipe> {
  return new Map(recipes.map((r) => [r.id, r]));
}
