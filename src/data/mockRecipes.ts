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
  },
];

export const recentRecipes = [...mockRecipes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3);

export type MealTypeFilter = "all" | "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
