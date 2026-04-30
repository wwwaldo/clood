export type GroceryStore = "Loblaws" | "Metro" | "T&T";

export const GROCERY_STORES: GroceryStore[] = ["Loblaws", "Metro", "T&T"];

export interface Meal {
  name: string;
  description: string;
  calories: number;
  protein: number; // grams
  ingredients: string[];
  steps: string[];
  store: GroceryStore;
}

export interface DayPlan {
  label: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    snack: Meal;
  };
}

const WEEKLY_PLAN: DayPlan[] = [
  {
    label: "Monday",
    meals: {
      breakfast: {
        name: "Greek yogurt parfait",
        description: "Greek yogurt with granola, blueberries, and honey",
        calories: 380,
        protein: 24,
        ingredients: [
          "1 cup plain Greek yogurt",
          "1/3 cup granola",
          "1/2 cup blueberries",
          "1 tbsp honey",
        ],
        steps: [
          "Spoon half the yogurt into a bowl or jar.",
          "Layer half the granola and blueberries on top.",
          "Repeat with remaining yogurt, granola, and blueberries.",
          "Drizzle honey over the top and serve immediately.",
        ],
        store: "Loblaws",
      },
      lunch: {
        name: "Grilled chicken salad",
        description: "Mixed greens, grilled chicken breast, avocado, cherry tomatoes, olive oil dressing",
        calories: 520,
        protein: 42,
        ingredients: [
          "6 oz chicken breast",
          "4 cups mixed greens",
          "1/2 avocado, sliced",
          "1/2 cup cherry tomatoes, halved",
          "2 tbsp olive oil",
          "1 tbsp lemon juice",
          "Salt and pepper to taste",
        ],
        steps: [
          "Season chicken breast with salt and pepper.",
          "Grill over medium-high heat for 5-6 minutes per side until cooked through (165F internal).",
          "Let chicken rest 5 minutes, then slice.",
          "Toss greens with olive oil and lemon juice.",
          "Top with sliced chicken, avocado, and cherry tomatoes.",
        ],
        store: "Metro",
      },
      dinner: {
        name: "Salmon with roasted vegetables",
        description: "Baked salmon fillet, roasted broccoli and sweet potato, lemon butter",
        calories: 620,
        protein: 45,
        ingredients: [
          "6 oz salmon fillet",
          "2 cups broccoli florets",
          "1 medium sweet potato, cubed",
          "2 tbsp olive oil",
          "1 tbsp butter",
          "1 lemon",
          "Salt, pepper, garlic powder",
        ],
        steps: [
          "Preheat oven to 400F.",
          "Toss sweet potato cubes with 1 tbsp olive oil, salt, and pepper. Spread on a baking sheet and roast for 15 minutes.",
          "Add broccoli to the sheet, toss with remaining olive oil. Roast 15 more minutes.",
          "Place salmon on a separate sheet, season with salt, pepper, and garlic powder.",
          "Bake salmon for 12-14 minutes until it flakes easily.",
          "Melt butter with juice of half the lemon, drizzle over salmon.",
          "Serve salmon alongside roasted vegetables with lemon wedges.",
        ],
        store: "Loblaws",
      },
      snack: {
        name: "Apple with almond butter",
        description: "Sliced apple with 2 tbsp almond butter",
        calories: 270,
        protein: 7,
        ingredients: [
          "1 medium apple",
          "2 tbsp almond butter",
        ],
        steps: [
          "Core and slice the apple into wedges.",
          "Serve with almond butter for dipping.",
        ],
        store: "Loblaws",
      },
    },
  },
  {
    label: "Tuesday",
    meals: {
      breakfast: {
        name: "Overnight oats",
        description: "Rolled oats soaked in almond milk with chia seeds, banana, and walnuts",
        calories: 410,
        protein: 14,
        ingredients: [
          "1/2 cup rolled oats",
          "1 cup almond milk",
          "1 tbsp chia seeds",
          "1 banana, sliced",
          "2 tbsp walnuts, chopped",
          "1 tsp maple syrup (optional)",
        ],
        steps: [
          "Combine oats, almond milk, and chia seeds in a jar. Stir well.",
          "Cover and refrigerate overnight (or at least 4 hours).",
          "In the morning, stir and top with sliced banana and walnuts.",
          "Drizzle with maple syrup if desired.",
        ],
        store: "Loblaws",
      },
      lunch: {
        name: "Turkey wrap",
        description: "Whole wheat wrap with turkey, spinach, hummus, cucumber, and bell pepper",
        calories: 480,
        protein: 35,
        ingredients: [
          "1 large whole wheat tortilla",
          "4 oz sliced turkey breast",
          "1 cup baby spinach",
          "2 tbsp hummus",
          "1/4 cucumber, sliced thin",
          "1/4 bell pepper, sliced thin",
        ],
        steps: [
          "Spread hummus evenly across the tortilla.",
          "Layer turkey, spinach, cucumber, and bell pepper down the center.",
          "Fold in the sides and roll tightly.",
          "Slice in half diagonally and serve.",
        ],
        store: "Metro",
      },
      dinner: {
        name: "Chicken stir-fry",
        description: "Chicken breast with broccoli, snap peas, carrots, ginger soy sauce over brown rice",
        calories: 580,
        protein: 40,
        ingredients: [
          "6 oz chicken breast, sliced thin",
          "1 cup broccoli florets",
          "1/2 cup snap peas",
          "1 carrot, julienned",
          "2 tbsp soy sauce",
          "1 tbsp sesame oil",
          "1 tsp fresh ginger, grated",
          "2 cloves garlic, minced",
          "1 cup cooked brown rice",
        ],
        steps: [
          "Cook brown rice according to package directions.",
          "Heat sesame oil in a wok or large skillet over high heat.",
          "Add chicken slices, stir-fry 4-5 minutes until browned. Remove and set aside.",
          "Add broccoli, snap peas, and carrot to the wok. Stir-fry 3-4 minutes.",
          "Add garlic and ginger, cook 30 seconds until fragrant.",
          "Return chicken to wok, add soy sauce, toss to combine.",
          "Serve over brown rice.",
        ],
        store: "T&T",
      },
      snack: {
        name: "Trail mix",
        description: "Almonds, cashews, dried cranberries, dark chocolate chips",
        calories: 250,
        protein: 8,
        ingredients: [
          "2 tbsp almonds",
          "2 tbsp cashews",
          "1 tbsp dried cranberries",
          "1 tbsp dark chocolate chips",
        ],
        steps: [
          "Combine all ingredients in a small bowl or bag.",
          "Portion out and enjoy.",
        ],
        store: "Loblaws",
      },
    },
  },
  {
    label: "Wednesday",
    meals: {
      breakfast: {
        name: "Veggie egg scramble",
        description: "3 eggs scrambled with spinach, mushrooms, and feta, whole grain toast",
        calories: 420,
        protein: 28,
        ingredients: [
          "3 large eggs",
          "1 cup fresh spinach",
          "1/2 cup mushrooms, sliced",
          "2 tbsp feta cheese, crumbled",
          "1 tsp olive oil",
          "1 slice whole grain bread",
          "Salt and pepper to taste",
        ],
        steps: [
          "Heat olive oil in a non-stick pan over medium heat.",
          "Saute mushrooms for 3-4 minutes until golden.",
          "Add spinach, cook 1 minute until wilted.",
          "Whisk eggs with salt and pepper, pour into the pan.",
          "Gently stir until eggs are just set (about 2 minutes).",
          "Top with crumbled feta. Serve with toasted bread.",
        ],
        store: "Metro",
      },
      lunch: {
        name: "Quinoa bowl",
        description: "Quinoa with black beans, corn, avocado, salsa, and lime",
        calories: 540,
        protein: 22,
        ingredients: [
          "1 cup cooked quinoa",
          "1/2 cup black beans, drained and rinsed",
          "1/3 cup corn kernels",
          "1/2 avocado, diced",
          "3 tbsp salsa",
          "Juice of 1/2 lime",
          "Fresh cilantro, chopped",
          "Salt to taste",
        ],
        steps: [
          "Cook quinoa according to package directions and let cool slightly.",
          "Warm black beans and corn together in a small pan or microwave.",
          "Layer quinoa in a bowl, top with beans, corn, and avocado.",
          "Spoon salsa on top, squeeze lime juice over everything.",
          "Garnish with cilantro and salt to taste.",
        ],
        store: "Loblaws",
      },
      dinner: {
        name: "Lean beef tacos",
        description: "Corn tortillas with seasoned ground beef, pico de gallo, cabbage slaw, lime crema",
        calories: 590,
        protein: 38,
        ingredients: [
          "5 oz lean ground beef (90/10)",
          "3 small corn tortillas",
          "1 tsp chili powder",
          "1/2 tsp cumin",
          "1/2 tsp garlic powder",
          "1/2 cup shredded cabbage",
          "1/4 cup pico de gallo",
          "2 tbsp sour cream",
          "Juice of 1/2 lime",
          "Salt to taste",
        ],
        steps: [
          "Brown ground beef in a skillet over medium-high heat, breaking it up as it cooks.",
          "Drain any excess fat. Add chili powder, cumin, garlic powder, and salt. Stir and cook 1 minute.",
          "Mix sour cream with lime juice to make the crema.",
          "Warm tortillas in a dry skillet or directly over a gas flame.",
          "Fill tortillas with seasoned beef, top with cabbage, pico de gallo, and lime crema.",
        ],
        store: "Metro",
      },
      snack: {
        name: "Cottage cheese with pineapple",
        description: "Low-fat cottage cheese with fresh pineapple chunks",
        calories: 200,
        protein: 20,
        ingredients: [
          "3/4 cup low-fat cottage cheese",
          "1/2 cup fresh pineapple, diced",
        ],
        steps: [
          "Spoon cottage cheese into a bowl.",
          "Top with pineapple chunks and serve.",
        ],
        store: "Loblaws",
      },
    },
  },
  {
    label: "Thursday",
    meals: {
      breakfast: {
        name: "Smoothie bowl",
        description: "Blended acai, banana, and berries topped with granola, coconut, and hemp seeds",
        calories: 400,
        protein: 12,
        ingredients: [
          "1 frozen acai packet (100g)",
          "1 frozen banana",
          "1/2 cup frozen mixed berries",
          "1/4 cup almond milk",
          "2 tbsp granola",
          "1 tbsp shredded coconut",
          "1 tbsp hemp seeds",
        ],
        steps: [
          "Blend acai packet, frozen banana, berries, and almond milk until thick and smooth. Use as little liquid as possible for a thick consistency.",
          "Pour into a bowl.",
          "Top with granola, shredded coconut, and hemp seeds.",
          "Eat immediately with a spoon.",
        ],
        store: "Loblaws",
      },
      lunch: {
        name: "Tuna poke bowl",
        description: "Sushi rice with ahi tuna, edamame, cucumber, avocado, sesame soy dressing",
        calories: 560,
        protein: 38,
        ingredients: [
          "5 oz sushi-grade ahi tuna, cubed",
          "1 cup cooked sushi rice",
          "1/3 cup shelled edamame",
          "1/4 cucumber, sliced",
          "1/2 avocado, sliced",
          "2 tbsp soy sauce",
          "1 tsp sesame oil",
          "1 tsp rice vinegar",
          "Sesame seeds and scallions for garnish",
        ],
        steps: [
          "Cook sushi rice according to package directions. Let cool to room temperature.",
          "Toss tuna cubes with soy sauce, sesame oil, and rice vinegar. Let marinate 5 minutes.",
          "Place rice in a bowl. Arrange tuna, edamame, cucumber, and avocado on top.",
          "Drizzle any remaining marinade over the bowl.",
          "Garnish with sesame seeds and sliced scallions.",
        ],
        store: "T&T",
      },
      dinner: {
        name: "Baked chicken thighs",
        description: "Herb-roasted chicken thighs with garlic mashed potatoes and steamed green beans",
        calories: 610,
        protein: 42,
        ingredients: [
          "2 bone-in chicken thighs (about 8 oz total)",
          "1 tbsp olive oil",
          "1 tsp dried thyme",
          "1 tsp dried rosemary",
          "1 tsp paprika",
          "2 medium potatoes, peeled and cubed",
          "2 tbsp butter",
          "2 cloves garlic, minced",
          "1/4 cup milk",
          "1 cup green beans",
          "Salt and pepper to taste",
        ],
        steps: [
          "Preheat oven to 425F.",
          "Pat chicken thighs dry. Rub with olive oil, thyme, rosemary, paprika, salt, and pepper.",
          "Place on a baking sheet and roast 35-40 minutes until skin is crispy and internal temp reaches 175F.",
          "Meanwhile, boil potatoes until fork-tender (about 15 minutes). Drain.",
          "Mash potatoes with butter, garlic, milk, salt, and pepper until smooth.",
          "Steam green beans for 4-5 minutes until tender-crisp.",
          "Serve chicken over mashed potatoes with green beans on the side.",
        ],
        store: "Metro",
      },
      snack: {
        name: "Protein bar",
        description: "Dark chocolate almond protein bar",
        calories: 220,
        protein: 20,
        ingredients: [
          "1 dark chocolate almond protein bar (store-bought)",
        ],
        steps: [
          "Unwrap and enjoy. Look for bars with 20g+ protein and minimal added sugar.",
        ],
        store: "Loblaws",
      },
    },
  },
  {
    label: "Friday",
    meals: {
      breakfast: {
        name: "Avocado toast with eggs",
        description: "Sourdough toast with mashed avocado, two poached eggs, everything seasoning",
        calories: 440,
        protein: 22,
        ingredients: [
          "2 slices sourdough bread",
          "1 ripe avocado",
          "2 large eggs",
          "1 tbsp white vinegar (for poaching)",
          "Everything bagel seasoning",
          "Red pepper flakes (optional)",
          "Salt to taste",
        ],
        steps: [
          "Toast the sourdough until golden.",
          "Mash avocado with a fork, season with salt.",
          "Bring a pot of water to a gentle simmer, add vinegar.",
          "Create a swirl in the water, crack an egg into the center. Poach 3-4 minutes. Repeat with second egg.",
          "Spread mashed avocado on toast, place a poached egg on each slice.",
          "Sprinkle with everything bagel seasoning and red pepper flakes.",
        ],
        store: "Loblaws",
      },
      lunch: {
        name: "Mediterranean bowl",
        description: "Falafel, hummus, tabbouleh, pickled onion, cucumber, tahini over greens",
        calories: 530,
        protein: 20,
        ingredients: [
          "4 falafel patties (store-bought or homemade)",
          "3 tbsp hummus",
          "1/4 cup tabbouleh",
          "2 tbsp pickled red onion",
          "1/4 cucumber, diced",
          "2 cups mixed greens",
          "1 tbsp tahini",
          "Juice of 1/2 lemon",
        ],
        steps: [
          "Bake or pan-fry falafel according to package directions.",
          "Arrange greens in a bowl.",
          "Place falafel, hummus, tabbouleh, pickled onion, and cucumber on top.",
          "Thin tahini with lemon juice and a splash of water, drizzle over the bowl.",
        ],
        store: "Metro",
      },
      dinner: {
        name: "Shrimp pasta",
        description: "Whole wheat linguine with garlic shrimp, cherry tomatoes, spinach, white wine sauce",
        calories: 600,
        protein: 36,
        ingredients: [
          "6 oz whole wheat linguine",
          "8 oz shrimp, peeled and deveined",
          "1 cup cherry tomatoes, halved",
          "2 cups fresh spinach",
          "3 cloves garlic, sliced",
          "1/4 cup dry white wine",
          "2 tbsp olive oil",
          "1 tbsp butter",
          "Red pepper flakes, salt, pepper",
          "Fresh parsley for garnish",
        ],
        steps: [
          "Cook linguine according to package directions. Reserve 1/2 cup pasta water before draining.",
          "Heat olive oil in a large skillet over medium-high heat.",
          "Season shrimp with salt, pepper, and red pepper flakes. Sear 2 minutes per side. Remove and set aside.",
          "In the same pan, add garlic, cook 30 seconds. Add cherry tomatoes, cook 2 minutes.",
          "Pour in white wine, simmer 1 minute to reduce.",
          "Add spinach, stir until wilted. Add butter.",
          "Toss in cooked pasta and shrimp. Add pasta water as needed for sauce consistency.",
          "Garnish with parsley and serve.",
        ],
        store: "Loblaws",
      },
      snack: {
        name: "Edamame",
        description: "Steamed edamame with sea salt",
        calories: 190,
        protein: 17,
        ingredients: [
          "1 cup frozen edamame in pods",
          "Sea salt to taste",
        ],
        steps: [
          "Steam or microwave edamame for 3-4 minutes until heated through.",
          "Drain, toss with sea salt, and serve.",
        ],
        store: "T&T",
      },
    },
  },
  {
    label: "Saturday",
    meals: {
      breakfast: {
        name: "Banana pancakes",
        description: "Oat flour pancakes with sliced banana, maple syrup, and a side of turkey bacon",
        calories: 460,
        protein: 22,
        ingredients: [
          "1 cup oat flour (or blend rolled oats into flour)",
          "1 egg",
          "3/4 cup milk",
          "1 tsp baking powder",
          "1 banana, sliced",
          "2 strips turkey bacon",
          "1 tbsp maple syrup",
          "Cooking spray",
        ],
        steps: [
          "Mix oat flour, baking powder, egg, and milk until just combined (small lumps are fine).",
          "Heat a non-stick pan over medium heat, spray with cooking spray.",
          "Pour 1/4 cup batter per pancake. Place a few banana slices on top.",
          "Cook until bubbles form on surface (2-3 minutes), then flip. Cook 1-2 more minutes.",
          "Meanwhile, cook turkey bacon in a separate pan until crisp.",
          "Stack pancakes, drizzle with maple syrup, and serve with bacon.",
        ],
        store: "Loblaws",
      },
      lunch: {
        name: "Chicken Caesar wrap",
        description: "Grilled chicken, romaine, parmesan, light Caesar dressing in a spinach tortilla",
        calories: 500,
        protein: 38,
        ingredients: [
          "5 oz grilled chicken breast, sliced",
          "1 large spinach tortilla",
          "1 cup romaine lettuce, chopped",
          "2 tbsp shaved parmesan",
          "2 tbsp light Caesar dressing",
        ],
        steps: [
          "Lay the spinach tortilla flat.",
          "Drizzle Caesar dressing down the center.",
          "Layer romaine, sliced chicken, and parmesan.",
          "Fold in the sides and roll tightly.",
          "Slice in half and serve.",
        ],
        store: "Metro",
      },
      dinner: {
        name: "Grilled steak with sweet potato",
        description: "Sirloin steak, baked sweet potato with cinnamon, roasted asparagus",
        calories: 640,
        protein: 48,
        ingredients: [
          "6 oz sirloin steak",
          "1 large sweet potato",
          "1 bunch asparagus (about 12 spears), trimmed",
          "1 tbsp olive oil",
          "1 tbsp butter",
          "1/2 tsp cinnamon",
          "Salt, pepper, garlic powder",
        ],
        steps: [
          "Preheat oven to 400F. Pierce sweet potato with a fork, bake 45-50 minutes until soft.",
          "About 20 minutes before the sweet potato is done, toss asparagus with olive oil, salt, and pepper. Roast on a sheet pan for 12-15 minutes.",
          "Let steak come to room temperature. Season generously with salt, pepper, and garlic powder.",
          "Grill or pan-sear steak over high heat: 4 minutes per side for medium-rare, 5 for medium.",
          "Rest steak 5 minutes, then slice against the grain.",
          "Split sweet potato open, add butter and cinnamon.",
          "Serve steak with sweet potato and asparagus.",
        ],
        store: "Loblaws",
      },
      snack: {
        name: "Greek yogurt with honey",
        description: "Plain Greek yogurt drizzled with honey and a sprinkle of cinnamon",
        calories: 180,
        protein: 18,
        ingredients: [
          "3/4 cup plain Greek yogurt",
          "1 tbsp honey",
          "Pinch of cinnamon",
        ],
        steps: [
          "Spoon yogurt into a bowl.",
          "Drizzle with honey and dust with cinnamon.",
        ],
        store: "Loblaws",
      },
    },
  },
  {
    label: "Sunday",
    meals: {
      breakfast: {
        name: "Breakfast burrito",
        description: "Scrambled eggs, black beans, cheese, salsa, and avocado in a whole wheat tortilla",
        calories: 480,
        protein: 28,
        ingredients: [
          "2 large eggs",
          "1 large whole wheat tortilla",
          "1/4 cup black beans, drained",
          "2 tbsp shredded cheddar cheese",
          "2 tbsp salsa",
          "1/4 avocado, sliced",
          "1 tsp olive oil",
          "Salt and pepper to taste",
        ],
        steps: [
          "Heat olive oil in a pan over medium heat.",
          "Whisk eggs with salt and pepper, scramble until just set.",
          "Warm tortilla in a dry pan or microwave for 15 seconds.",
          "Layer eggs, black beans, cheese, salsa, and avocado down the center of the tortilla.",
          "Fold in sides and roll tightly into a burrito.",
          "Optional: toast seam-side down in a pan for a crispy exterior.",
        ],
        store: "Metro",
      },
      lunch: {
        name: "Lentil soup with bread",
        description: "Hearty lentil vegetable soup with a slice of crusty sourdough",
        calories: 450,
        protein: 22,
        ingredients: [
          "1 cup dried green or brown lentils, rinsed",
          "1 carrot, diced",
          "1 celery stalk, diced",
          "1/2 onion, diced",
          "2 cloves garlic, minced",
          "1 can (14 oz) diced tomatoes",
          "4 cups vegetable broth",
          "1 tsp cumin",
          "1 tbsp olive oil",
          "1 slice crusty sourdough",
          "Salt and pepper to taste",
        ],
        steps: [
          "Heat olive oil in a large pot over medium heat.",
          "Saute onion, carrot, and celery for 5 minutes until softened.",
          "Add garlic and cumin, cook 30 seconds.",
          "Add lentils, diced tomatoes, and broth. Bring to a boil.",
          "Reduce heat to low, cover, and simmer 25-30 minutes until lentils are tender.",
          "Season with salt and pepper.",
          "Serve in a bowl with a slice of crusty sourdough. (Recipe makes about 4 servings — refrigerate the rest.)",
        ],
        store: "Loblaws",
      },
      dinner: {
        name: "Roast chicken with root vegetables",
        description: "Herb-roasted whole chicken breast, carrots, parsnips, potatoes, pan gravy",
        calories: 600,
        protein: 44,
        ingredients: [
          "8 oz bone-in, skin-on chicken breast",
          "2 carrots, cut into chunks",
          "1 parsnip, cut into chunks",
          "2 small potatoes, quartered",
          "2 tbsp olive oil",
          "1 tsp dried thyme",
          "1 tsp dried rosemary",
          "3 cloves garlic, smashed",
          "1/2 cup chicken broth (for gravy)",
          "Salt and pepper to taste",
        ],
        steps: [
          "Preheat oven to 425F.",
          "Toss carrots, parsnip, and potatoes with 1 tbsp olive oil, salt, and pepper. Spread on a roasting pan.",
          "Rub chicken breast with remaining olive oil, thyme, rosemary, salt, and pepper. Nestle among vegetables. Tuck garlic cloves around.",
          "Roast 35-40 minutes until chicken reaches 165F internal and skin is golden.",
          "Remove chicken and vegetables to a plate. Rest chicken 5 minutes.",
          "Place roasting pan on the stove over medium heat. Add chicken broth, scrape up any browned bits. Simmer 2-3 minutes for a quick pan gravy.",
          "Slice chicken and serve over vegetables, spooning gravy on top.",
        ],
        store: "Metro",
      },
      snack: {
        name: "Mixed berries with dark chocolate",
        description: "Fresh strawberries, raspberries, and a few squares of dark chocolate",
        calories: 200,
        protein: 4,
        ingredients: [
          "1/2 cup strawberries, halved",
          "1/2 cup raspberries",
          "1 oz dark chocolate (70%+ cacao)",
        ],
        steps: [
          "Wash and halve strawberries.",
          "Arrange berries on a plate alongside dark chocolate squares.",
          "Enjoy together — the bitterness of the chocolate pairs well with the sweet berries.",
        ],
        store: "Loblaws",
      },
    },
  },
];

export function getAllDayPlans(): DayPlan[] {
  return WEEKLY_PLAN;
}

/**
 * Get today's meal plan based on day of the week.
 * Monday = 0, Sunday = 6.
 */
export function getTodayMealPlan(): DayPlan {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const planIndex = jsDay === 0 ? 6 : jsDay - 1; // remap to Mon=0, Sun=6
  return WEEKLY_PLAN[planIndex];
}

/**
 * Format today's meal plan for injection into the system prompt.
 */
export function formatMealPlanForPrompt(plan: DayPlan): string {
  const { meals } = plan;
  const totalCal =
    meals.breakfast.calories +
    meals.lunch.calories +
    meals.dinner.calories +
    meals.snack.calories;
  const totalProtein =
    meals.breakfast.protein +
    meals.lunch.protein +
    meals.dinner.protein +
    meals.snack.protein;

  return [
    `## Today's meal plan (${plan.label})`,
    `Daily totals: ~${totalCal} cal, ~${totalProtein}g protein`,
    "",
    `**Breakfast:** ${meals.breakfast.name} — ${meals.breakfast.description} (${meals.breakfast.calories} cal, ${meals.breakfast.protein}g protein)`,
    `**Lunch:** ${meals.lunch.name} — ${meals.lunch.description} (${meals.lunch.calories} cal, ${meals.lunch.protein}g protein)`,
    `**Dinner:** ${meals.dinner.name} — ${meals.dinner.description} (${meals.dinner.calories} cal, ${meals.dinner.protein}g protein)`,
    `**Snack:** ${meals.snack.name} — ${meals.snack.description} (${meals.snack.calories} cal, ${meals.snack.protein}g protein)`,
    "",
    "Reference this plan when the user asks about meals, what to eat, or nutrition. You can proactively mention upcoming meals during check-ins.",
  ].join("\n");
}
