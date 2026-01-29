export interface Ingredient {
  quantity: number;
  name: string;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  cookTime: string;
  cookTimeMinutes: number;
  isFavorite: boolean;
  author?: string;
  source?: string;
  imageUrl: string;
  createdAt: Date;
  ingredients: Array<Ingredient>;
}

export const mockRecipes: Array<Recipe> = [
  {
    id: "1",
    title: "Banana Pancakes",
    mealType: "breakfast",
    cookTime: "25 min",
    cookTimeMinutes: 25,
    isFavorite: true,
    author: "Mom's Recipe",
    imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-20"),
    ingredients: [
      { quantity: 2, name: "bananas", unit: "whole" },
      { quantity: 1.5, name: "flour", unit: "cups" },
      { quantity: 2, name: "eggs", unit: "whole" },
      { quantity: 1, name: "milk", unit: "cup" },
      { quantity: 2, name: "butter", unit: "tbsp" },
      { quantity: 1, name: "baking powder", unit: "tsp" },
      { quantity: 2, name: "sugar", unit: "tbsp" }
    ],
  },
  {
    id: "2",
    title: "Grilled Chicken Salad",
    mealType: "lunch",
    cookTime: "20 min",
    cookTimeMinutes: 20,
    isFavorite: false,
    author: "Healthy Eats Blog",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-18"),
    ingredients: [
      { quantity: 8, name: "chicken breast", unit: "oz" },
      { quantity: 2, name: "lettuce", unit: "cups" },
      { quantity: 1, name: "tomato", unit: "whole" },
      { quantity: 0.5, name: "cucumber", unit: "whole" },
      { quantity: 2, name: "olive oil", unit: "tbsp" },
      { quantity: 1, name: "lemon juice", unit: "tbsp" }
    ],
  },
  {
    id: "3",
    title: "Spaghetti Carbonara",
    mealType: "dinner",
    cookTime: "35 min",
    cookTimeMinutes: 35,
    isFavorite: true,
    source: "Italian Cookbook",
    imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-22"),
    ingredients: [
      { quantity: 12, name: "spaghetti", unit: "oz" },
      { quantity: 3, name: "eggs", unit: "whole" },
      { quantity: 6, name: "bacon", unit: "slices" },
      { quantity: 1, name: "parmesan cheese", unit: "cup" },
      { quantity: 1, name: "black pepper", unit: "tsp" }
    ],
  },
  {
    id: "4",
    title: "Avocado Toast",
    mealType: "breakfast",
    cookTime: "10 min",
    cookTimeMinutes: 10,
    isFavorite: false,
    author: "Quick Bites",
    imageUrl: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-15"),
    ingredients: [
      { quantity: 2, name: "bread slices", unit: "whole" },
      { quantity: 1, name: "avocado", unit: "whole" },
      { quantity: 1, name: "lemon juice", unit: "tsp" },
      { quantity: 0.5, name: "red pepper flakes", unit: "tsp" },
      { quantity: 1, name: "olive oil", unit: "tbsp" },
      { quantity: 0.25, name: "salt", unit: "tsp" }
    ],
  },
  {
    id: "5",
    title: "Thai Green Curry",
    mealType: "dinner",
    cookTime: "45 min",
    cookTimeMinutes: 45,
    isFavorite: true,
    source: "Thai Kitchen",
    imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-10"),
    ingredients: [
      { quantity: 12, name: "chicken thighs", unit: "oz" },
      { quantity: 3, name: "green curry paste", unit: "tbsp" },
      { quantity: 1, name: "coconut milk", unit: "can" },
      { quantity: 1, name: "bamboo shoots", unit: "cup" },
      { quantity: 2, name: "thai basil", unit: "tbsp" },
      { quantity: 1, name: "fish sauce", unit: "tbsp" }
    ],
  },
  {
    id: "6",
    title: "Caesar Salad",
    mealType: "lunch",
    cookTime: "15 min",
    cookTimeMinutes: 15,
    isFavorite: false,
    author: "Classic Recipes",
    imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-23"),
    ingredients: [
      { quantity: 1, name: "romaine lettuce", unit: "head" },
      { quantity: 0.5, name: "parmesan cheese", unit: "cup" },
      { quantity: 1, name: "croutons", unit: "cup" },
      { quantity: 3, name: "caesar dressing", unit: "tbsp" },
      { quantity: 2, name: "anchovy fillets", unit: "whole" }
    ],
  },
  {
    id: "7",
    title: "Chocolate Chip Cookies",
    mealType: "dessert",
    cookTime: "30 min",
    cookTimeMinutes: 30,
    isFavorite: true,
    author: "Grandma's Kitchen",
    imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-12"),
    ingredients: [
      { quantity: 2.25, name: "flour", unit: "cups" },
      { quantity: 1, name: "butter", unit: "cup" },
      { quantity: 0.75, name: "brown sugar", unit: "cup" },
      { quantity: 2, name: "eggs", unit: "whole" },
      { quantity: 2, name: "chocolate chips", unit: "cups" },
      { quantity: 1, name: "vanilla extract", unit: "tsp" }
    ],
  },
  {
    id: "8",
    title: "Veggie Stir Fry",
    mealType: "dinner",
    cookTime: "20 min",
    cookTimeMinutes: 20,
    isFavorite: false,
    source: "Wok This Way",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-24"),
    ingredients: [
      { quantity: 2, name: "broccoli", unit: "cups" },
      { quantity: 1, name: "bell pepper", unit: "whole" },
      { quantity: 1, name: "carrots", unit: "cup" },
      { quantity: 2, name: "soy sauce", unit: "tbsp" },
      { quantity: 1, name: "garlic", unit: "tbsp" },
      { quantity: 1, name: "ginger", unit: "tsp" }
    ],
  },
  {
    id: "9",
    title: "Blueberry Muffins",
    mealType: "breakfast",
    cookTime: "40 min",
    cookTimeMinutes: 40,
    isFavorite: true,
    author: "Baking Blog",
    imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-21"),
    ingredients: [
      { quantity: 2, name: "flour", unit: "cups" },
      { quantity: 0.75, name: "sugar", unit: "cup" },
      { quantity: 2, name: "eggs", unit: "whole" },
      { quantity: 0.5, name: "milk", unit: "cup" },
      { quantity: 1.5, name: "blueberries", unit: "cups" },
      { quantity: 2, name: "baking powder", unit: "tsp" }
    ],
  },
  {
    id: "10",
    title: "Caprese Sandwich",
    mealType: "lunch",
    cookTime: "8 min",
    cookTimeMinutes: 8,
    isFavorite: false,
    author: "Quick Lunch Ideas",
    imageUrl: "https://images.unsplash.com/photo-1585238341710-4dd0e06651e6?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-19"),
    ingredients: [
      { quantity: 2, name: "ciabatta bread", unit: "slices" },
      { quantity: 4, name: "mozzarella cheese", unit: "slices" },
      { quantity: 1, name: "tomato", unit: "whole" },
      { quantity: 4, name: "basil leaves", unit: "whole" },
      { quantity: 1, name: "balsamic glaze", unit: "tbsp" }
    ],
  },
  {
    id: "11",
    title: "Beef Tacos",
    mealType: "dinner",
    cookTime: "30 min",
    cookTimeMinutes: 30,
    isFavorite: true,
    source: "Mexican Kitchen",
    imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-17"),
    ingredients: [
      { quantity: 1, name: "ground beef", unit: "lb" },
      { quantity: 8, name: "taco shells", unit: "whole" },
      { quantity: 1, name: "lettuce", unit: "cup" },
      { quantity: 1, name: "cheddar cheese", unit: "cup" },
      { quantity: 2, name: "taco seasoning", unit: "tbsp" },
      { quantity: 1, name: "sour cream", unit: "cup" }
    ],
  },
  {
    id: "12",
    title: "Tiramisu",
    mealType: "dessert",
    cookTime: "20 min",
    cookTimeMinutes: 20,
    isFavorite: true,
    author: "Italian Desserts",
    imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-11"),
    ingredients: [
      { quantity: 16, name: "mascarpone cheese", unit: "oz" },
      { quantity: 3, name: "eggs", unit: "whole" },
      { quantity: 0.5, name: "sugar", unit: "cup" },
      { quantity: 24, name: "ladyfinger cookies", unit: "whole" },
      { quantity: 1, name: "espresso", unit: "cup" },
      { quantity: 2, name: "cocoa powder", unit: "tbsp" }
    ],
  },
  {
    id: "13",
    title: "Egg Fried Rice",
    mealType: "lunch",
    cookTime: "15 min",
    cookTimeMinutes: 15,
    isFavorite: false,
    source: "Asian Cuisine",
    imageUrl: "https://images.unsplash.com/photo-1606283829581-e32953fe18f1?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-16"),
    ingredients: [
      { quantity: 3, name: "cooked rice", unit: "cups" },
      { quantity: 2, name: "eggs", unit: "whole" },
      { quantity: 1, name: "peas", unit: "cup" },
      { quantity: 2, name: "soy sauce", unit: "tbsp" },
      { quantity: 2, name: "green onions", unit: "whole" },
      { quantity: 1, name: "sesame oil", unit: "tsp" }
    ],
  },
  {
    id: "14",
    title: "Grilled Salmon",
    mealType: "dinner",
    cookTime: "25 min",
    cookTimeMinutes: 25,
    isFavorite: true,
    author: "Seafood Chef",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-14"),
    ingredients: [
      { quantity: 12, name: "salmon fillet", unit: "oz" },
      { quantity: 2, name: "lemon", unit: "whole" },
      { quantity: 2, name: "olive oil", unit: "tbsp" },
      { quantity: 1, name: "dill", unit: "tbsp" },
      { quantity: 0.5, name: "garlic powder", unit: "tsp" }
    ],
  },
  {
    id: "15",
    title: "French Toast",
    mealType: "breakfast",
    cookTime: "15 min",
    cookTimeMinutes: 15,
    isFavorite: false,
    author: "Breakfast Classics",
    imageUrl: "https://images.unsplash.com/photo-1603046891726-36bfd957e2af?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-13"),
    ingredients: [
      { quantity: 4, name: "bread slices", unit: "whole" },
      { quantity: 2, name: "eggs", unit: "whole" },
      { quantity: 0.25, name: "milk", unit: "cup" },
      { quantity: 1, name: "vanilla extract", unit: "tsp" },
      { quantity: 0.5, name: "cinnamon", unit: "tsp" },
      { quantity: 2, name: "butter", unit: "tbsp" }
    ],
  },
  {
    id: "16",
    title: "Quinoa Buddha Bowl",
    mealType: "lunch",
    cookTime: "20 min",
    cookTimeMinutes: 20,
    isFavorite: true,
    author: "Healthy Bowls",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-09"),
    ingredients: [
      { quantity: 1, name: "quinoa", unit: "cup" },
      { quantity: 1, name: "chickpeas", unit: "cup" },
      { quantity: 1, name: "kale", unit: "cup" },
      { quantity: 0.5, name: "avocado", unit: "whole" },
      { quantity: 2, name: "tahini", unit: "tbsp" },
      { quantity: 1, name: "lemon juice", unit: "tbsp" }
    ],
  },
  {
    id: "17",
    title: "Beef Stroganoff",
    mealType: "dinner",
    cookTime: "50 min",
    cookTimeMinutes: 50,
    isFavorite: true,
    source: "Russian Kitchen",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ec1?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-08"),
    ingredients: [
      { quantity: 1, name: "beef sirloin", unit: "lb" },
      { quantity: 8, name: "mushrooms", unit: "oz" },
      { quantity: 1, name: "sour cream", unit: "cup" },
      { quantity: 1, name: "onion", unit: "whole" },
      { quantity: 2, name: "beef broth", unit: "cups" },
      { quantity: 12, name: "egg noodles", unit: "oz" }
    ],
  },
  {
    id: "18",
    title: "Strawberry Cheesecake",
    mealType: "dessert",
    cookTime: "45 min",
    cookTimeMinutes: 45,
    isFavorite: false,
    author: "Dessert Dreams",
    imageUrl: "https://images.unsplash.com/photo-1589985643961-eb7fcb707c11?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-07"),
    ingredients: [
      { quantity: 16, name: "cream cheese", unit: "oz" },
      { quantity: 0.75, name: "sugar", unit: "cup" },
      { quantity: 3, name: "eggs", unit: "whole" },
      { quantity: 1, name: "graham cracker crust", unit: "whole" },
      { quantity: 2, name: "strawberries", unit: "cups" },
      { quantity: 1, name: "vanilla extract", unit: "tsp" }
    ],
  },
  {
    id: "19",
    title: "Greek Wrap",
    mealType: "lunch",
    cookTime: "12 min",
    cookTimeMinutes: 12,
    isFavorite: false,
    author: "Mediterranean Kitchen",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-06"),
    ingredients: [
      { quantity: 1, name: "tortilla wrap", unit: "whole" },
      { quantity: 4, name: "chicken breast", unit: "oz" },
      { quantity: 0.5, name: "feta cheese", unit: "cup" },
      { quantity: 0.25, name: "cucumber", unit: "whole" },
      { quantity: 2, name: "tzatziki sauce", unit: "tbsp" },
      { quantity: 0.5, name: "tomato", unit: "whole" }
    ],
  },
  {
    id: "20",
    title: "Roast Chicken",
    mealType: "dinner",
    cookTime: "75 min",
    cookTimeMinutes: 75,
    isFavorite: true,
    source: "Classic Roasts",
    imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-05"),
    ingredients: [
      { quantity: 1, name: "whole chicken", unit: "whole" },
      { quantity: 2, name: "lemon", unit: "whole" },
      { quantity: 3, name: "garlic cloves", unit: "whole" },
      { quantity: 2, name: "rosemary", unit: "tbsp" },
      { quantity: 2, name: "olive oil", unit: "tbsp" },
      { quantity: 1, name: "salt", unit: "tsp" }
    ],
  },
  {
    id: "21",
    title: "Yogurt Parfait",
    mealType: "breakfast",
    cookTime: "5 min",
    cookTimeMinutes: 5,
    isFavorite: false,
    author: "Quick Bites",
    imageUrl: "https://images.unsplash.com/photo-1553530666-ba2a8e36c6f8?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-04"),
    ingredients: [
      { quantity: 1, name: "greek yogurt", unit: "cup" },
      { quantity: 0.5, name: "granola", unit: "cup" },
      { quantity: 0.5, name: "mixed berries", unit: "cup" },
      { quantity: 1, name: "honey", unit: "tbsp" }
    ],
  },
  {
    id: "22",
    title: "Chocolate Brownies",
    mealType: "dessert",
    cookTime: "35 min",
    cookTimeMinutes: 35,
    isFavorite: true,
    author: "Bakery Recipes",
    imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-03"),
    ingredients: [
      { quantity: 1, name: "butter", unit: "cup" },
      { quantity: 8, name: "dark chocolate", unit: "oz" },
      { quantity: 1.5, name: "sugar", unit: "cups" },
      { quantity: 3, name: "eggs", unit: "whole" },
      { quantity: 1, name: "flour", unit: "cup" },
      { quantity: 0.5, name: "cocoa powder", unit: "cup" }
    ],
  },
  {
    id: "23",
    title: "Shrimp Pasta",
    mealType: "dinner",
    cookTime: "25 min",
    cookTimeMinutes: 25,
    isFavorite: false,
    source: "Seafood Recipes",
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
    createdAt: new Date("2026-01-02"),
    ingredients: [
      { quantity: 12, name: "shrimp", unit: "oz" },
      { quantity: 12, name: "linguine", unit: "oz" },
      { quantity: 3, name: "garlic cloves", unit: "whole" },
      { quantity: 2, name: "white wine", unit: "tbsp" },
      { quantity: 2, name: "cherry tomatoes", unit: "cups" },
      { quantity: 2, name: "olive oil", unit: "tbsp" }
    ],
  },
];

export const recentRecipes = [...mockRecipes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3);

export type MealTypeFilter = "all" | "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
