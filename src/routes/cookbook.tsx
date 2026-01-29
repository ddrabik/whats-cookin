import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Heart,
  Clock,
  MoreHorizontal,
  Trash2,
  Plus,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Cake,
  Star,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  X,
  User,
} from "lucide-react";
import type { MealTypeFilter, Recipe } from "~/data/mockRecipes";
import { mockRecipes, recentRecipes } from "~/data/mockRecipes";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Toggle } from "~/components/ui/toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

export const Route = createFileRoute("/cookbook")({
  component: CookbookPage,
});

type SortField = "createdAt" | "cookTime";
type SortDirection = "asc" | "desc";

function CookbookPage() {
  const [categoryFilter, setCategoryFilter] = useState<MealTypeFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [recipes, setRecipes] = useState<Array<Recipe>>(mockRecipes);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filteredAndSortedRecipes = useMemo(() => {
    let result = recipes.filter((recipe) => {
      if (favoritesOnly && !recipe.isFavorite) return false;
      if (categoryFilter === "all") return true;
      return recipe.mealType === categoryFilter;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdAt") {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortField === "cookTime") {
        comparison = a.cookTimeMinutes - b.cookTimeMinutes;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [recipes, categoryFilter, favoritesOnly, sortField, sortDirection]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
    if (selectedRecipe?.id === id) {
      setSelectedRecipe((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const stats = {
    total: recipes.length,
    favorites: recipes.filter((r) => r.isFavorite).length,
    breakfast: recipes.filter((r) => r.mealType === "breakfast").length,
    lunch: recipes.filter((r) => r.mealType === "lunch").length,
    dinner: recipes.filter((r) => r.mealType === "dinner").length,
    dessert: recipes.filter((r) => r.mealType === "dessert").length,
  };

  const categoryItems: Array<{ key: MealTypeFilter; label: string; icon: React.ReactNode; count: number }> = [
    { key: "all", label: "All Recipes", icon: <Filter className="h-4 w-4" />, count: stats.total },
    { key: "breakfast", label: "Breakfast", icon: <Sunrise className="h-4 w-4" />, count: stats.breakfast },
    { key: "lunch", label: "Lunch", icon: <Sun className="h-4 w-4" />, count: stats.lunch },
    { key: "dinner", label: "Dinner", icon: <Moon className="h-4 w-4" />, count: stats.dinner },
    { key: "dessert", label: "Dessert", icon: <Cake className="h-4 w-4" />, count: stats.dessert },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar */}
        <aside className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold">Cookbook</h1>
            <Button size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Category Navigation */}
          <nav className="space-y-1">
            {/* All Recipes */}
            {categoryItems.slice(0, 1).map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setCategoryFilter(item.key);
                  setFavoritesOnly(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                  !favoritesOnly
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
                <span className={`text-xs ${!favoritesOnly ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {item.count}
                </span>
              </button>
            ))}

            {/* Favorites Filter */}
            <button
              onClick={() => {
                setFavoritesOnly(!favoritesOnly);
                if (!favoritesOnly) {
                  setCategoryFilter("all");
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                favoritesOnly
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className={`h-4 w-4 ${favoritesOnly ? "fill-current" : ""}`} />
                Favorites
              </span>
              <span className={`text-xs ${favoritesOnly ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {stats.favorites}
              </span>
            </button>

          </nav>

          {/* Recently Used Section */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-3">Recently Used</h3>
            <div className="space-y-1">
              {recentRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors group text-left"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={recipe.imageUrl} alt={recipe.title} />
                    <AvatarFallback>{recipe.title[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground truncate">
                    {recipe.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Filter Bar */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3 flex-wrap">
              {(["breakfast", "lunch", "dinner", "dessert"] as Array<MealTypeFilter>).map((cat) => {
                const item = categoryItems.find(i => i.key === cat);
                if (!item) return null;
                const isSelected = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      if (isSelected) {
                        setCategoryFilter("all");
                      } else {
                        setCategoryFilter(cat);
                      }
                    }}
                    className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 px-6 py-4 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-28">Category</TableHead>
                  <TableHead className="w-24">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("cookTime")}
                    >
                      Time
                      {getSortIcon("cookTime")}
                    </button>
                  </TableHead>
                  <TableHead className="w-32">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort("createdAt")}
                    >
                      Added
                      {getSortIcon("createdAt")}
                    </button>
                  </TableHead>
                  <TableHead className="w-20 text-center">Favorite</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRecipes.map((recipe) => (
                  <RecipeTableRow
                    key={recipe.id}
                    recipe={recipe}
                    onToggleFavorite={toggleFavorite}
                    onRowClick={() => setSelectedRecipe(recipe)}
                    formatDate={formatDate}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Full Screen Recipe Modal */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          {selectedRecipe && (
            <>
              {/* Hero Image */}
              <div className="relative h-64 flex-shrink-0">
                <img
                  src={selectedRecipe.imageUrl}
                  alt={selectedRecipe.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-bold text-white">
                      {selectedRecipe.title}
                    </DialogTitle>
                  </DialogHeader>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                  onClick={() => setSelectedRecipe(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <CategoryBadge mealType={selectedRecipe.mealType} />
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {selectedRecipe.cookTime}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-4 w-4" />
                    {selectedRecipe.author || selectedRecipe.source}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Added {formatDate(selectedRecipe.createdAt)}
                  </span>
                  <Button
                    variant={selectedRecipe.isFavorite ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => toggleFavorite(selectedRecipe.id, e)}
                    className="ml-auto"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${selectedRecipe.isFavorite ? "fill-current" : ""}`} />
                    {selectedRecipe.isFavorite ? "Favorited" : "Add to Favorites"}
                  </Button>
                </div>

                {/* Placeholder content */}
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                    <p className="text-muted-foreground">Ingredients would be displayed here...</p>
                  </section>
                  <section>
                    <h3 className="text-lg font-semibold mb-3">Instructions</h3>
                    <p className="text-muted-foreground">Step-by-step instructions would be displayed here...</p>
                  </section>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function CategoryBadge({ mealType }: { mealType: Recipe["mealType"] }) {
  const categoryStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
    breakfast: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", icon: <Sunrise className="h-3 w-3" /> },
    lunch: { bg: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", icon: <Sun className="h-3 w-3" /> },
    dinner: { bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", icon: <Moon className="h-3 w-3" /> },
    snack: { bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: <Coffee className="h-3 w-3" /> },
    dessert: { bg: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300", icon: <Cake className="h-3 w-3" /> },
  };
  const style = categoryStyles[mealType];

  return (
    <Badge variant="secondary" className={`${style.bg} border-0`}>
      <span className="flex items-center gap-1">
        {style.icon}
        {mealType}
      </span>
    </Badge>
  );
}

function RecipeTableRow({
  recipe,
  onToggleFavorite,
  onRowClick,
  formatDate,
}: {
  recipe: Recipe;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onRowClick: () => void;
  formatDate: (date: Date) => string;
}) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onRowClick}
    >
      <TableCell>
        <Avatar className="h-10 w-10 rounded-md">
          <AvatarImage src={recipe.imageUrl} alt={recipe.title} className="object-cover" />
          <AvatarFallback className="rounded-md">{recipe.title[0]}</AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{recipe.title}</p>
          <p className="text-xs text-muted-foreground">{recipe.author || recipe.source}</p>
        </div>
      </TableCell>
      <TableCell>
        <CategoryBadge mealType={recipe.mealType} />
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {recipe.cookTime}
        </span>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1 text-muted-foreground text-sm">
          <Calendar className="h-3 w-3" />
          {formatDate(recipe.createdAt)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => onToggleFavorite(recipe.id, e)}
        >
          <Heart
            className={`h-4 w-4 ${recipe.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
          />
        </Button>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
