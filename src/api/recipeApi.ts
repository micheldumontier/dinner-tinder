// Mock of an external recipe API (shaped like TheMealDB).
//
// Swap this module for a real `fetch("https://www.themealdb.com/...")` call
// later — the rest of the app only depends on `fetchRecipes(): Promise<Recipe[]>`
// and the `Recipe` shape, so nothing else needs to change.

import type { Recipe } from "./types";

// Dark placeholder card with the dish name, matching the app's theme. The
// SwipeCard component already falls back to a gradient + 🍲 if loading fails.
function thumb(name: string): string {
  return `https://placehold.co/600x800/1a1a1a/ff4458?font=lora&text=${encodeURIComponent(name)}`;
}

const RECIPES: Recipe[] = [
  // --- Breakfast ----------------------------------------------------------
  {
    id: "french-toast",
    name: "French Toast with Fresh Whipped Cream and Real Maple Syrup",
    category: "Breakfast",
    area: "French",
    thumbnail: thumb("French Toast"),
    instructions:
      "Soak thick brioche slices in egg, milk, cinnamon and vanilla. Griddle in butter until golden, top with whipped cream and a generous pour of real maple syrup.",
    ingredients: ["Brioche", "Eggs", "Milk", "Cinnamon", "Vanilla", "Butter", "Maple syrup", "Whipped cream"],
  },
  {
    id: "overnight-waffles",
    name: "Overnight Fluffy Waffles",
    category: "Breakfast",
    area: "Belgian",
    thumbnail: thumb("Overnight Waffles"),
    instructions:
      "Whisk yeast batter the night before and let it bloom in the fridge. In the morning, fold in eggs and bake in a hot iron until crisp outside and pillowy within.",
    ingredients: ["Flour", "Yeast", "Milk", "Butter", "Eggs", "Sugar", "Salt"],
  },
  {
    id: "overnight-oats",
    name: "Healthy Overnight Oats",
    category: "Breakfast",
    area: "American",
    thumbnail: thumb("Overnight Oats"),
    instructions:
      "Stir rolled oats with milk, yogurt, chia seeds and a touch of honey. Refrigerate overnight, then top with berries and toasted nuts.",
    ingredients: ["Rolled oats", "Milk", "Yogurt", "Chia seeds", "Honey", "Berries", "Nuts"],
  },
  {
    id: "chicken-sausage",
    name: "Chicken Sausage",
    category: "Breakfast",
    area: "American",
    thumbnail: thumb("Chicken Sausage"),
    instructions:
      "Brown chicken sausage links in a skillet over medium heat, turning until evenly caramelised and cooked through.",
    ingredients: ["Chicken sausage", "Olive oil", "Black pepper"],
  },
  {
    id: "eggs-sunny-side-up",
    name: "Eggs, Sunny Side Up",
    category: "Breakfast",
    area: "American",
    thumbnail: thumb("Sunny Side Up"),
    instructions:
      "Crack eggs into a buttered pan over low heat, cover briefly, and serve once the whites are set and the yolks are still glossy.",
    ingredients: ["Eggs", "Butter", "Salt", "Black pepper"],
  },
  {
    id: "yogurt-fruit-granola",
    name: "Yogurt with Fruits and Granola",
    category: "Breakfast",
    area: "International",
    thumbnail: thumb("Yogurt & Granola"),
    instructions:
      "Layer thick yogurt with seasonal fruit and a generous handful of crunchy granola. Drizzle with honey if you like.",
    ingredients: ["Greek yogurt", "Berries", "Banana", "Granola", "Honey"],
  },

  // --- Snacks -------------------------------------------------------------
  {
    id: "buttery-popcorn",
    name: "Buttery Popcorn",
    category: "Snacks",
    area: "American",
    thumbnail: thumb("Buttery Popcorn"),
    instructions:
      "Pop kernels in hot oil with the lid on. Drown in melted butter, shower with salt, eat from the bowl on the couch.",
    ingredients: ["Popcorn kernels", "Neutral oil", "Butter", "Salt"],
  },
  {
    id: "chips-and-guac",
    name: "Chips and Guacamole",
    category: "Snacks",
    area: "Mexican",
    thumbnail: thumb("Chips & Guac"),
    instructions:
      "Mash ripe avocado with lime, salt, finely diced onion, tomato and cilantro. Serve with warm tortilla chips.",
    ingredients: ["Tortilla chips", "Avocado", "Lime", "Onion", "Tomato", "Cilantro", "Salt"],
  },

  // --- Appetisers ---------------------------------------------------------
  {
    id: "charcuterie-board",
    name: "Charcuterie Board",
    category: "Appetisers",
    area: "French",
    thumbnail: thumb("Charcuterie Board"),
    instructions:
      "Arrange cured meats, pâté and pickles on a board with crusty bread, cornichons, mustard and a little jar of jam. Eat at leisure with wine.",
    ingredients: ["Prosciutto", "Salami", "Pâté", "Cornichons", "Mustard", "Baguette", "Jam"],
  },
  {
    id: "cheese-cracker-board",
    name: "Cheese and Cracker Board",
    category: "Appetisers",
    area: "International",
    thumbnail: thumb("Cheese & Crackers"),
    instructions:
      "Pick three or four cheeses with different textures, pair with a variety of crackers, fresh fruit, nuts and a spoonful of honey.",
    ingredients: ["Brie", "Aged cheddar", "Blue cheese", "Crackers", "Grapes", "Walnuts", "Honey"],
  },
  {
    id: "chicken-wings",
    name: "Chicken Wings with Carrots, Celery and Ranch",
    category: "Appetisers",
    area: "American",
    thumbnail: thumb("Chicken Wings"),
    instructions:
      "Bake or fry wings until crisp, toss in your sauce of choice, and serve with carrot and celery sticks and a bowl of ranch.",
    ingredients: ["Chicken wings", "Hot sauce", "Butter", "Carrots", "Celery", "Ranch dressing"],
  },
  {
    id: "greek-salad",
    name: "Greek Salad",
    category: "Appetisers",
    area: "Greek",
    thumbnail: thumb("Greek Salad"),
    instructions:
      "Chunk tomato, cucumber, red onion and green pepper. Top with kalamata olives and a thick slab of feta. Dress with olive oil, oregano and lemon.",
    ingredients: ["Tomato", "Cucumber", "Red onion", "Green pepper", "Kalamata olives", "Feta", "Olive oil", "Oregano"],
  },
  {
    id: "insalata-caprese",
    name: "Insalata Caprese",
    category: "Appetisers",
    area: "Italian",
    thumbnail: thumb("Caprese"),
    instructions:
      "Alternate slices of fresh mozzarella and ripe tomato with basil leaves. Drizzle with good olive oil, finish with flaky salt and cracked pepper.",
    ingredients: ["Fresh mozzarella", "Tomato", "Basil", "Olive oil", "Salt", "Black pepper"],
  },

  // --- Soups --------------------------------------------------------------
  {
    id: "chicken-soup",
    name: "Chicken Soup",
    category: "Soups",
    area: "International",
    thumbnail: thumb("Chicken Soup"),
    instructions:
      "Simmer chicken with onion, carrot, celery and herbs until the broth is rich. Shred the meat back in and add noodles or rice.",
    ingredients: ["Chicken", "Onion", "Carrot", "Celery", "Parsley", "Bay leaf", "Egg noodles"],
  },
  {
    id: "turkey-soup",
    name: "Turkey Soup (Seasonal)",
    category: "Soups",
    area: "American",
    thumbnail: thumb("Turkey Soup"),
    instructions:
      "Use the leftover turkey carcass to build a deep stock. Add root vegetables, herbs and shredded turkey for a post-feast classic.",
    ingredients: ["Turkey carcass", "Onion", "Carrot", "Celery", "Thyme", "Bay leaf", "Barley"],
  },
  {
    id: "potato-leek-soup",
    name: "Potato Leek Soup",
    category: "Soups",
    area: "French",
    thumbnail: thumb("Potato Leek Soup"),
    instructions:
      "Sweat sliced leeks in butter, add potatoes and stock, simmer until tender, blend smooth. Finish with cream and chives.",
    ingredients: ["Leeks", "Potatoes", "Butter", "Vegetable stock", "Cream", "Chives", "Salt"],
  },

  // --- Italian ------------------------------------------------------------
  {
    id: "spaghetti-meat-sauce",
    name: "Spaghetti with Meat Sauce",
    category: "Italian",
    area: "Italian",
    thumbnail: thumb("Spaghetti Bolognese"),
    instructions:
      "Brown ground beef with onion and garlic, deglaze with red wine, simmer with tomato and herbs until thick. Toss with spaghetti and parmesan.",
    ingredients: ["Spaghetti", "Ground beef", "Onion", "Garlic", "Tomato", "Red wine", "Basil", "Parmesan"],
  },
  {
    id: "spaghetti-meatballs",
    name: "Spaghetti with Meatballs",
    category: "Italian",
    area: "Italian",
    thumbnail: thumb("Spaghetti & Meatballs"),
    instructions:
      "Roll seasoned beef-and-pork meatballs, brown all over, then simmer in tomato sauce. Pile onto spaghetti, shower with parmesan.",
    ingredients: ["Spaghetti", "Ground beef", "Ground pork", "Breadcrumbs", "Egg", "Tomato sauce", "Parmesan"],
  },
  {
    id: "spaghetti-carbonara",
    name: "Spaghetti Carbonara",
    category: "Italian",
    area: "Italian",
    thumbnail: thumb("Carbonara"),
    instructions:
      "Render guanciale until crisp. Off-heat, toss hot spaghetti with eggs, pecorino and black pepper until silky. No cream, ever.",
    ingredients: ["Spaghetti", "Guanciale", "Eggs", "Pecorino romano", "Black pepper"],
  },
  {
    id: "linguine-scallops",
    name: "Linguine with Scallops",
    category: "Italian",
    area: "Italian",
    thumbnail: thumb("Linguine Scallops"),
    instructions:
      "Sear scallops in butter for a deep crust. Toss linguine with garlic, white wine, lemon and parsley, then nestle the scallops on top.",
    ingredients: ["Linguine", "Scallops", "Butter", "Garlic", "White wine", "Lemon", "Parsley"],
  },
  {
    id: "linguine-scampi",
    name: "Linguine with Scampi",
    category: "Italian",
    area: "Italian",
    thumbnail: thumb("Linguine Scampi"),
    instructions:
      "Sauté shrimp with garlic, chilli flakes and white wine. Finish with butter and lemon, toss through linguine and a fistful of parsley.",
    ingredients: ["Linguine", "Shrimp", "Garlic", "Chilli flakes", "White wine", "Butter", "Lemon", "Parsley"],
  },
  {
    id: "pan-pizza",
    name: "Pan Pizza",
    category: "Italian",
    area: "Italian",
    thumbnail: thumb("Pan Pizza"),
    instructions:
      "Press an oily dough into a cast-iron pan, top with sauce and cheese all the way to the edge for a frico crust. Bake hot until bubbling.",
    ingredients: ["Pizza dough", "Olive oil", "Tomato sauce", "Mozzarella", "Parmesan", "Oregano"],
  },
  {
    id: "pizza-napoli",
    name: "Pizza Napoli",
    category: "Italian",
    area: "Italian",
    thumbnail: thumb("Pizza Napoli"),
    instructions:
      "Top thin pizza dough with tomato, mozzarella, anchovies, capers and oregano. Bake as hot as your oven will go.",
    ingredients: ["Pizza dough", "Tomato", "Mozzarella", "Anchovies", "Capers", "Oregano", "Olive oil"],
  },

  // --- Belgian ------------------------------------------------------------
  {
    id: "vol-au-vent",
    name: "Vol-au-Vent",
    category: "Belgian",
    area: "Belgian",
    thumbnail: thumb("Vol-au-Vent"),
    instructions:
      "Fill golden puff-pastry shells with a creamy chicken-and-mushroom ragout. Classic Belgian comfort, ideally served with frites.",
    ingredients: ["Puff pastry", "Chicken", "Mushrooms", "Cream", "Butter", "Flour", "Lemon", "Parsley"],
  },

  // --- American -----------------------------------------------------------
  {
    id: "ribeye-steak",
    name: "Rib Eye Steak with Arugula, Roasted Cherry Tomatoes and Parmesan",
    category: "American",
    area: "American",
    thumbnail: thumb("Rib Eye Steak"),
    instructions:
      "Sear a thick rib eye in a screaming-hot pan, rest, slice. Plate over peppery arugula with blistered cherry tomatoes and parmesan shavings.",
    ingredients: ["Rib eye steak", "Arugula", "Cherry tomatoes", "Parmesan", "Olive oil", "Salt", "Black pepper"],
  },
  {
    id: "cedar-plank-bbq-salmon",
    name: "Cedar Plank BBQ Salmon",
    category: "American",
    area: "American",
    thumbnail: thumb("Cedar Plank Salmon"),
    instructions:
      "Soak a cedar plank, lay salmon on top, grill with the lid down. The wood smoke perfumes the fish as it cooks through.",
    ingredients: ["Salmon fillet", "Cedar plank", "Olive oil", "Lemon", "Brown sugar", "Smoked paprika", "Salt"],
  },
  {
    id: "oven-baked-salmon-rice-wine",
    name: "Oven Baked Salmon with Rice Wine",
    category: "American",
    area: "American",
    thumbnail: thumb("Oven Baked Salmon"),
    instructions:
      "Marinate salmon in rice wine, soy and ginger, roast in a hot oven until just opaque. Spoon the pan juices over and serve with rice.",
    ingredients: ["Salmon fillet", "Rice wine", "Soy sauce", "Ginger", "Garlic", "Scallion", "Sesame oil"],
  },
  {
    id: "double-smash-cheeseburger",
    name: "Double Smash Cheeseburger with Fries",
    category: "American",
    area: "American",
    thumbnail: thumb("Smash Burger"),
    instructions:
      "Smash two beef balls onto a screaming-hot griddle, melt cheese over each, stack in a toasted bun with pickles and special sauce. Fries on the side.",
    ingredients: ["Ground beef", "Burger buns", "American cheese", "Pickles", "Special sauce", "Onion", "French fries"],
  },
  {
    id: "bbq-chicken-burgers",
    name: "BBQ Chicken Burgers",
    category: "American",
    area: "American",
    thumbnail: thumb("BBQ Chicken Burger"),
    instructions:
      "Grill chicken patties, brush with smoky barbecue sauce in the last minute, build with melted cheese, crisp bacon and red onion on a brioche bun.",
    ingredients: ["Ground chicken", "BBQ sauce", "Cheddar", "Bacon", "Red onion", "Brioche buns", "Lettuce"],
  },
  {
    id: "bbq-ribs",
    name: "BBQ Ribs",
    category: "American",
    area: "American",
    thumbnail: thumb("BBQ Ribs"),
    instructions:
      "Rub ribs with a smoky-sweet spice mix, cook low-and-slow until the meat pulls clean from the bone, glaze with barbecue sauce at the very end.",
    ingredients: ["Pork ribs", "Brown sugar", "Smoked paprika", "Garlic powder", "Black pepper", "BBQ sauce"],
  },
  {
    id: "rack-of-lamb",
    name: "Rack of Lamb",
    category: "American",
    area: "American",
    thumbnail: thumb("Rack of Lamb"),
    instructions:
      "Sear a frenched rack, brush with mustard and a herb-and-breadcrumb crust, roast to a rosy medium-rare. Rest, then carve between the bones.",
    ingredients: ["Rack of lamb", "Dijon mustard", "Breadcrumbs", "Parsley", "Rosemary", "Garlic", "Olive oil"],
  },
  {
    id: "beef-chilli",
    name: "Beef Chilli",
    category: "American",
    area: "American",
    thumbnail: thumb("Beef Chilli"),
    instructions:
      "Brown beef, build with onion, garlic, chillies and toasted spices. Simmer with tomato and beans low and slow until rich.",
    ingredients: ["Ground beef", "Onion", "Garlic", "Chilli powder", "Cumin", "Tomato", "Kidney beans"],
  },
  {
    id: "slow-roasted-turkey",
    name: "Slow Roasted Turkey with Stuffing (Seasonal)",
    category: "American",
    area: "American",
    thumbnail: thumb("Roast Turkey"),
    instructions:
      "Butter the turkey under and over the skin, roast low and slow until the juices run clear. Bake stuffing alongside for crisp edges.",
    ingredients: ["Whole turkey", "Butter", "Sage", "Thyme", "Onion", "Celery", "Bread", "Chicken stock"],
  },
  {
    id: "slow-roasted-whole-chicken",
    name: "Slow Roasted Whole Chicken",
    category: "American",
    area: "American",
    thumbnail: thumb("Roast Chicken"),
    instructions:
      "Season a chicken inside and out, stuff with lemon and herbs, roast slowly until the skin is golden and the legs wiggle loose.",
    ingredients: ["Whole chicken", "Butter", "Lemon", "Garlic", "Thyme", "Rosemary", "Salt", "Black pepper"],
  },
  {
    id: "southern-fried-chicken",
    name: "Southern Fried Chicken",
    category: "American",
    area: "American",
    thumbnail: thumb("Fried Chicken"),
    instructions:
      "Brine chicken in buttermilk, dredge in seasoned flour, fry in hot oil until shatteringly crisp and cooked through.",
    ingredients: ["Chicken pieces", "Buttermilk", "Flour", "Paprika", "Cayenne", "Garlic powder", "Frying oil"],
  },
  {
    id: "jambalaya",
    name: "Jambalaya",
    category: "American",
    area: "American",
    thumbnail: thumb("Jambalaya"),
    instructions:
      "Build a base of the holy trinity with sausage and chicken, toast rice in the fond, add tomato and stock, simmer until the rice drinks it all up.",
    ingredients: ["Andouille sausage", "Chicken", "Onion", "Celery", "Green pepper", "Long-grain rice", "Tomato", "Cajun spice"],
  },
  {
    id: "grilled-cheese",
    name: "Grilled Cheese",
    category: "American",
    area: "American",
    thumbnail: thumb("Grilled Cheese"),
    instructions:
      "Butter the outside of two bread slices, sandwich with sharp cheese, griddle low and slow until deeply golden and oozy through.",
    ingredients: ["Sourdough bread", "Butter", "Sharp cheddar", "Gruyère"],
  },

  // --- Sides --------------------------------------------------------------
  {
    id: "smash-potatoes",
    name: "Smash Potatoes",
    category: "Sides",
    area: "American",
    thumbnail: thumb("Smash Potatoes"),
    instructions:
      "Boil baby potatoes until tender, smash flat, douse in olive oil and salt, roast in a hot oven until the edges crisp.",
    ingredients: ["Baby potatoes", "Olive oil", "Salt", "Black pepper", "Rosemary"],
  },
  {
    id: "spicy-cucumbers",
    name: "Spicy Cucumbers",
    category: "Sides",
    area: "Asian",
    thumbnail: thumb("Spicy Cucumbers"),
    instructions:
      "Smash cucumbers, salt and drain. Toss with garlic, soy, black vinegar, chilli oil and a drop of sesame oil.",
    ingredients: ["Cucumber", "Garlic", "Soy sauce", "Black vinegar", "Chilli oil", "Sesame oil", "Sugar"],
  },
  {
    id: "cranberry-sauce",
    name: "Cranberry Sauce",
    category: "Sides",
    area: "American",
    thumbnail: thumb("Cranberry Sauce"),
    instructions:
      "Simmer cranberries with sugar, orange zest and a splash of juice until they pop and thicken. Cool before serving.",
    ingredients: ["Fresh cranberries", "Sugar", "Orange zest", "Orange juice", "Cinnamon"],
  },
  {
    id: "garlic-mash-potatoes",
    name: "Garlic Mash Potatoes",
    category: "Sides",
    area: "American",
    thumbnail: thumb("Garlic Mash"),
    instructions:
      "Boil potatoes with whole garlic cloves until soft, mash with hot cream and lots of butter, season generously.",
    ingredients: ["Russet potatoes", "Garlic", "Butter", "Cream", "Salt", "White pepper"],
  },
  {
    id: "cornbread",
    name: "Cornbread",
    category: "Sides",
    area: "American",
    thumbnail: thumb("Cornbread"),
    instructions:
      "Whisk cornmeal with buttermilk, egg and a little sugar, pour into a hot buttered skillet and bake until golden on top.",
    ingredients: ["Cornmeal", "Flour", "Buttermilk", "Egg", "Butter", "Sugar", "Baking powder"],
  },
  {
    id: "steamed-vegetables",
    name: "Steamed Vegetables",
    category: "Sides",
    area: "International",
    thumbnail: thumb("Steamed Veg"),
    instructions:
      "Steam mixed seasonal vegetables just until tender-crisp. Toss with butter, lemon and flaky salt.",
    ingredients: ["Broccoli", "Carrots", "Green beans", "Butter", "Lemon", "Salt"],
  },
  {
    id: "cinnamon-baked-squash",
    name: "Cinnamon Sugar Oven Baked Squash",
    category: "Sides",
    area: "American",
    thumbnail: thumb("Baked Squash"),
    instructions:
      "Halve a butternut or acorn squash, brush with butter, dust with cinnamon and brown sugar, bake until fork-tender and caramelised.",
    ingredients: ["Squash", "Butter", "Brown sugar", "Cinnamon", "Salt"],
  },
  {
    id: "airfried-french-fries",
    name: "Thin Cut French Fries, Airfried",
    category: "Sides",
    area: "Belgian",
    thumbnail: thumb("French Fries"),
    instructions:
      "Slice potatoes thin, soak briefly, dry well, toss with a little oil and salt, air-fry until crisp and golden, shaking the basket halfway.",
    ingredients: ["Potatoes", "Neutral oil", "Salt"],
  },
  {
    id: "white-rice",
    name: "White Rice",
    category: "Sides",
    area: "Asian",
    thumbnail: thumb("White Rice"),
    instructions:
      "Rinse rice until the water runs clear, cook with a measured amount of water until fluffy, rest covered before serving.",
    ingredients: ["Long-grain rice", "Water", "Salt"],
  },
  {
    id: "beet-cucumber-feta-salad",
    name: "Beet, Cucumber, Feta and Dill Salad",
    category: "Sides",
    area: "Mediterranean",
    thumbnail: thumb("Beet Feta Salad"),
    instructions:
      "Combine roasted beets, sliced cucumber and crumbled feta. Dress with olive oil, lemon juice and a generous handful of fresh dill.",
    ingredients: ["Beets", "Cucumber", "Feta", "Dill", "Olive oil", "Lemon", "Salt"],
  },

  // --- Asian --------------------------------------------------------------
  {
    id: "roast-duck-pancakes",
    name: "Roast Duck with Pancakes",
    category: "Asian",
    area: "Chinese",
    thumbnail: thumb("Roast Duck"),
    instructions:
      "Slice crisp-skinned roast duck and serve with warm thin pancakes, hoisin sauce, scallion batons and cucumber for everyone to wrap their own.",
    ingredients: ["Roast duck", "Mandarin pancakes", "Hoisin sauce", "Scallions", "Cucumber"],
  },
  {
    id: "shrimp-stir-fry",
    name: "Shrimp Stir Fry",
    category: "Asian",
    area: "Chinese",
    thumbnail: thumb("Shrimp Stir Fry"),
    instructions:
      "Sear shrimp in a screaming-hot wok with garlic and ginger. Toss in crisp vegetables and a quick soy-sesame sauce.",
    ingredients: ["Shrimp", "Garlic", "Ginger", "Bell pepper", "Snow peas", "Soy sauce", "Sesame oil"],
  },
  {
    id: "butter-chicken",
    name: "Butter Chicken with Rice",
    category: "Asian",
    area: "Indian",
    thumbnail: thumb("Butter Chicken"),
    instructions:
      "Marinate chicken in yogurt and spices, grill briefly, then simmer in a tomato-cream sauce finished with butter. Serve over basmati rice.",
    ingredients: ["Chicken", "Yogurt", "Tomato", "Butter", "Cream", "Garam masala", "Ginger", "Basmati rice"],
  },
  {
    id: "chirashi-bowl",
    name: "Chirashi Bowl",
    category: "Asian",
    area: "Japanese",
    thumbnail: thumb("Chirashi Bowl"),
    instructions:
      "Spoon seasoned sushi rice into a bowl, arrange slices of fresh sashimi on top with avocado, cucumber and a sprinkle of sesame and nori.",
    ingredients: ["Sushi rice", "Rice vinegar", "Sashimi-grade fish", "Avocado", "Cucumber", "Nori", "Soy sauce", "Wasabi"],
  },
  {
    id: "ramen",
    name: "Ramen",
    category: "Asian",
    area: "Japanese",
    thumbnail: thumb("Ramen"),
    instructions:
      "Coil fresh ramen noodles into a deep bowl of rich broth, top with chashu pork, a soft egg, scallions and a sheet of nori.",
    ingredients: ["Ramen noodles", "Chashu pork", "Soft-boiled egg", "Scallions", "Nori", "Pork broth", "Miso"],
  },

  // --- Mexican ------------------------------------------------------------
  {
    id: "beef-tacos",
    name: "Beef Tacos",
    category: "Mexican",
    area: "Mexican",
    thumbnail: thumb("Beef Tacos"),
    instructions:
      "Brown ground beef with onion, garlic and a smoky spice blend. Pile into warm corn tortillas with cilantro, onion, salsa and lime.",
    ingredients: ["Ground beef", "Corn tortillas", "Onion", "Garlic", "Cumin", "Chilli powder", "Cilantro", "Lime", "Salsa"],
  },
  {
    id: "chicken-quesadillas",
    name: "Chicken Quesadillas",
    category: "Mexican",
    area: "Mexican",
    thumbnail: thumb("Quesadillas"),
    instructions:
      "Layer cheese, shredded chicken and peppers between flour tortillas and griddle until the outside is crisp and the cheese is molten.",
    ingredients: ["Flour tortillas", "Shredded chicken", "Monterey jack", "Bell pepper", "Onion", "Butter", "Salsa"],
  },
  {
    id: "beef-nachos",
    name: "Beef Nachos",
    category: "Mexican",
    area: "Mexican",
    thumbnail: thumb("Beef Nachos"),
    instructions:
      "Pile tortilla chips on a tray, blanket with seasoned beef and cheese, bake until bubbling. Top with jalapeños, guacamole, sour cream and salsa.",
    ingredients: ["Tortilla chips", "Ground beef", "Cheddar", "Jalapeños", "Guacamole", "Sour cream", "Salsa"],
  },

  // --- Desserts -----------------------------------------------------------
  {
    id: "chocolate-chip-cookies-ala-mode",
    name: "Chocolate Chip Cookies à la Mode",
    category: "Desserts",
    area: "American",
    thumbnail: thumb("Cookies à la Mode"),
    instructions:
      "Bake thick chocolate chip cookies until the edges are crisp and the centres are still gooey. Serve warm with a scoop of vanilla ice cream.",
    ingredients: ["Butter", "Brown sugar", "Eggs", "Flour", "Chocolate chips", "Vanilla", "Vanilla ice cream"],
  },
  {
    id: "bourbon-vanilla-ice-cream",
    name: "Bourbon Vanilla Ice Cream with Maple Syrup and Walnuts",
    category: "Desserts",
    area: "American",
    thumbnail: thumb("Vanilla Ice Cream"),
    instructions:
      "Scoop bourbon-vanilla ice cream into a bowl, drizzle generously with real maple syrup and shower with toasted walnuts.",
    ingredients: ["Vanilla ice cream", "Maple syrup", "Walnuts"],
  },
  {
    id: "lemon-poppyseed-bread",
    name: "Lemon Poppyseed Bread",
    category: "Desserts",
    area: "American",
    thumbnail: thumb("Lemon Poppyseed"),
    instructions:
      "Fold lemon zest and poppy seeds into a tender pound cake batter, bake until golden, finish with a tangy lemon glaze.",
    ingredients: ["Flour", "Sugar", "Butter", "Eggs", "Lemon", "Poppy seeds", "Buttermilk"],
  },
  {
    id: "banana-walnut-bread",
    name: "Banana Walnut Bread",
    category: "Desserts",
    area: "American",
    thumbnail: thumb("Banana Walnut Bread"),
    instructions:
      "Mash very ripe bananas into a butter-and-brown-sugar batter, fold in walnuts, bake in a loaf tin until a skewer comes out clean.",
    ingredients: ["Ripe bananas", "Flour", "Brown sugar", "Butter", "Eggs", "Walnuts", "Cinnamon"],
  },

  // --- Cocktails ----------------------------------------------------------
  {
    id: "negroni",
    name: "Negroni",
    category: "Cocktails",
    area: "Italian",
    thumbnail: thumb("Negroni"),
    instructions:
      "Stir equal parts gin, Campari and sweet vermouth over ice. Strain into a rocks glass over a big cube and twist orange peel over the top.",
    ingredients: ["Gin", "Campari", "Sweet vermouth", "Orange peel", "Ice"],
  },
  {
    id: "aperol-spritz",
    name: "Aperol Spritz",
    category: "Cocktails",
    area: "Italian",
    thumbnail: thumb("Aperol Spritz"),
    instructions:
      "Build in a wine glass over ice: three parts prosecco, two parts Aperol, one part soda. Garnish with an orange slice and an olive if you're feeling Venetian.",
    ingredients: ["Aperol", "Prosecco", "Soda water", "Orange slice", "Ice"],
  },
  {
    id: "caipirinha",
    name: "Caipirinha",
    category: "Cocktails",
    area: "Brazilian",
    thumbnail: thumb("Caipirinha"),
    instructions:
      "Muddle lime wedges with sugar in a rocks glass, fill with cracked ice and top with cachaça. Stir, drink in the sun.",
    ingredients: ["Cachaça", "Lime", "Sugar", "Ice"],
  },
  {
    id: "mojito",
    name: "Mojito",
    category: "Cocktails",
    area: "Cuban",
    thumbnail: thumb("Mojito"),
    instructions:
      "Gently muddle mint with lime and sugar, add white rum and crushed ice, top with soda. Garnish with a fresh sprig of mint.",
    ingredients: ["White rum", "Mint", "Lime", "Sugar", "Soda water", "Crushed ice"],
  },
  {
    id: "kir-royale",
    name: "Kir Royale",
    category: "Cocktails",
    area: "French",
    thumbnail: thumb("Kir Royale"),
    instructions:
      "Pour a measure of crème de cassis into a flute, top with cold champagne. Sip slowly, with intent.",
    ingredients: ["Crème de cassis", "Champagne"],
  },
  {
    id: "gin-tonic",
    name: "Gin & Tonic",
    category: "Cocktails",
    area: "British",
    thumbnail: thumb("Gin & Tonic"),
    instructions:
      "Build over plenty of ice in a balloon glass: a generous measure of gin, top with good tonic, garnish with cucumber or a citrus twist.",
    ingredients: ["Gin", "Tonic water", "Lime or cucumber", "Ice"],
  },
  {
    id: "vodka-cranberry",
    name: "Vodka Cranberry",
    category: "Cocktails",
    area: "American",
    thumbnail: thumb("Vodka Cranberry"),
    instructions:
      "Pour vodka over ice in a highball, top with cranberry juice, finish with a squeeze of lime.",
    ingredients: ["Vodka", "Cranberry juice", "Lime", "Ice"],
  },
  {
    id: "chocolate-martini",
    name: "Chocolate Martini",
    category: "Cocktails",
    area: "American",
    thumbnail: thumb("Chocolate Martini"),
    instructions:
      "Shake vodka, chocolate liqueur and a splash of cream with ice until very cold. Strain into a chocolate-rimmed coupe.",
    ingredients: ["Vodka", "Chocolate liqueur", "Cream", "Cocoa powder", "Ice"],
  },

  // --- Spirits ------------------------------------------------------------
  {
    id: "whiskey",
    name: "Whiskey",
    category: "Spirits",
    area: "Scottish",
    thumbnail: thumb("Whiskey"),
    instructions:
      "Pour a measure of your favourite whiskey into a heavy-bottomed glass. Neat, or over a single large cube.",
    ingredients: ["Whiskey"],
  },
  {
    id: "bourbon",
    name: "Bourbon",
    category: "Spirits",
    area: "American",
    thumbnail: thumb("Bourbon"),
    instructions:
      "Pour a measure of bourbon into a rocks glass over a large cube. Optional: a single drop of water to open it up.",
    ingredients: ["Bourbon"],
  },
  {
    id: "chilled-vodka",
    name: "Chilled Vodka",
    category: "Spirits",
    area: "Russian",
    thumbnail: thumb("Chilled Vodka"),
    instructions:
      "Keep the bottle in the freezer until syrupy. Pour into a chilled shot glass and drink with food, in good company.",
    ingredients: ["Vodka"],
  },
  {
    id: "calvados",
    name: "Calvados",
    category: "Spirits",
    area: "French",
    thumbnail: thumb("Calvados"),
    instructions:
      "Serve a measure of calvados in a tulip glass, slightly warmed in the hand. A classic after-dinner Norman tradition.",
    ingredients: ["Calvados"],
  },

  // --- Cold drinks --------------------------------------------------------
  {
    id: "sparkling-water",
    name: "Sparkling Water",
    category: "Cold Drinks",
    area: "International",
    thumbnail: thumb("Sparkling Water"),
    instructions:
      "Pour ice-cold sparkling water into a tall glass. Add a squeeze of lemon or lime if you're being fancy.",
    ingredients: ["Sparkling water", "Lemon or lime", "Ice"],
  },
  {
    id: "banana-smoothie",
    name: "Banana Smoothie",
    category: "Cold Drinks",
    area: "American",
    thumbnail: thumb("Banana Smoothie"),
    instructions:
      "Blend a ripe banana with milk, yogurt, a spoon of honey and a few ice cubes until thick and silky.",
    ingredients: ["Banana", "Milk", "Yogurt", "Honey", "Ice"],
  },
  {
    id: "vanilla-super-milkshake",
    name: "Vanilla Super Milkshake",
    category: "Cold Drinks",
    area: "American",
    thumbnail: thumb("Vanilla Milkshake"),
    instructions:
      "Blend vanilla ice cream with cold milk and a splash of real vanilla until thick. Top with whipped cream.",
    ingredients: ["Vanilla ice cream", "Milk", "Vanilla extract", "Whipped cream"],
  },

  // --- Hot drinks ---------------------------------------------------------
  {
    id: "cappuccino",
    name: "Cappuccino",
    category: "Hot Drinks",
    area: "Italian",
    thumbnail: thumb("Cappuccino"),
    instructions:
      "Pull a double shot of espresso, top with equal parts steamed milk and dense microfoam. Optional dusting of cocoa.",
    ingredients: ["Espresso", "Milk", "Cocoa powder"],
  },
  {
    id: "espresso",
    name: "Espresso",
    category: "Hot Drinks",
    area: "Italian",
    thumbnail: thumb("Espresso"),
    instructions:
      "Pull a single or double shot from freshly ground beans into a warm demitasse. Drink within a minute, ideally standing at a bar.",
    ingredients: ["Espresso beans", "Water"],
  },
  {
    id: "latte",
    name: "Latte",
    category: "Hot Drinks",
    area: "Italian",
    thumbnail: thumb("Latte"),
    instructions:
      "Pull a double shot, top with a generous amount of silky steamed milk and a thin cap of microfoam. Art optional.",
    ingredients: ["Espresso", "Milk"],
  },
  {
    id: "green-tea",
    name: "Green Tea",
    category: "Hot Drinks",
    area: "Japanese",
    thumbnail: thumb("Green Tea"),
    instructions:
      "Heat water to around 80°C — not boiling — and steep good green tea leaves for two minutes. Pour and savour.",
    ingredients: ["Green tea leaves", "Water"],
  },
  {
    id: "chai-tea",
    name: "Chai Tea",
    category: "Hot Drinks",
    area: "Indian",
    thumbnail: thumb("Chai Tea"),
    instructions:
      "Simmer black tea with milk, ginger, cardamom, cinnamon and a touch of sugar until fragrant. Strain into a cup.",
    ingredients: ["Black tea", "Milk", "Ginger", "Cardamom", "Cinnamon", "Cloves", "Sugar"],
  },
  {
    id: "fresh-ginger-tea",
    name: "Fresh Ginger Tea",
    category: "Hot Drinks",
    area: "Asian",
    thumbnail: thumb("Ginger Tea"),
    instructions:
      "Simmer slices of fresh ginger in water for ten minutes. Strain into a mug, sweeten with honey and brighten with lemon.",
    ingredients: ["Fresh ginger", "Water", "Honey", "Lemon"],
  },
  {
    id: "fresh-mint-tea",
    name: "Fresh Mint Tea",
    category: "Hot Drinks",
    area: "Moroccan",
    thumbnail: thumb("Mint Tea"),
    instructions:
      "Stuff a teapot with a generous handful of fresh mint, pour over hot water (and optionally green tea), sweeten to taste.",
    ingredients: ["Fresh mint", "Green tea", "Sugar", "Hot water"],
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
