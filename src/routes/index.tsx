import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cake,
  Calendar,
  Clock,
  Coffee,
  Filter,
  Heart,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Sun,
  Sunrise,
  Trash2,
  User,
  X,
} from "lucide-react";

import { api } from "../../convex/_generated/api";
import type { FuseResultMatch } from "fuse.js";
import type { MealTypeFilter, Recipe } from "~/types/recipe";
import { formatQuantity } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import { Input } from "~/components/ui/input";
import { HighlightedText, createRecipeSearch } from "~/lib/searchUtils";
import { useDebounce } from "~/hooks/useDebounce";
import { AddRecipeModal } from "~/components/AddRecipeModal";
import { PendingRecipeRow } from "~/components/PendingRecipeRow";

export const Route = createFileRoute("/")({
  component: CookbookPage,
  pendingComponent: () => {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading cookbook...</p>
        </div>
      </div>
    );
  },
  errorComponent: ({ error }) => {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Failed to load cookbook
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  },
});

type SortField = "createdAt" | "cookTime";
type SortDirection = "asc" | "desc";

function CookbookPage() {
  const [categoryFilter, setCategoryFilter] = useState<MealTypeFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 100);

  // Fetch recipes from Convex
  const { data: recipes = [] } = useSuspenseQuery(
    convexQuery(api.recipes.list, {})
  );

  // Fetch recent recipes for sidebar
  const { data: recentRecipes = [] } = useSuspenseQuery(
    convexQuery(api.recipes.getRecent, { limit: 3 })
  );

  // Fetch pending recipes (being analyzed)
  const { data: pendingRecipes = [] } = useSuspenseQuery(
    convexQuery(api.vision.queries.getPendingRecipes, {})
  );

  // Mutations for toggling favorites and deleting
  const toggleFavoriteMutation = useMutation(api.recipes.toggleFavorite);
  const deleteRecipeMutation = useMutation(api.recipes.remove);

  const fuse = useMemo(() => createRecipeSearch(recipes), [recipes]);

  const filteredAndSortedRecipes = useMemo(() => {
    let result = recipes;
    const searchResults: Map<string, ReadonlyArray<FuseResultMatch>> = new Map();

    // Apply search if query exists
    if (debouncedSearchQuery.trim()) {
      const fuseResults = fuse.search(debouncedSearchQuery);
      result = fuseResults.map(r => r.item);

      // Store match metadata for highlighting
      fuseResults.forEach(r => {
        if (r.matches) {
          searchResults.set(r.item._id, r.matches);
        }
      });
    }

    // Apply filters
    result = result.filter((recipe) => {
      if (favoritesOnly && !recipe.isFavorite) return false;
      if (categoryFilter === "all") return true;
      return recipe.mealType === categoryFilter;
    });

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdAt") {
        comparison = a.createdAt - b.createdAt;
      } else {
        comparison = a.cookTimeMinutes - b.cookTimeMinutes;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return { recipes: result, searchResults };
  }, [recipes, debouncedSearchQuery, categoryFilter, favoritesOnly, sortField, sortDirection, fuse]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    void toggleFavoriteMutation({ id: id as any });
    // Optimistically update the selected recipe UI
    if (selectedRecipe?._id === id) {
      setSelectedRecipe((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const deleteRecipe = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    void deleteRecipeMutation({ id: id as any });
    // Close modal if deleting the selected recipe
    if (selectedRecipe?._id === id) {
      setSelectedRecipe(null);
    }
  };

  const handleSort = (field: SortField) => {
    setSortField(field);
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
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
    total: recipes.length + pendingRecipes.length,
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar */}
        <aside className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold">Cookbook</h1>
            <Button size="sm" className="h-8" onClick={() => setAddModalOpen(true)}>
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

          {/* Recently Used Section - Hidden on mobile/tablet */}
          <div className="hidden lg:block mt-6 pt-6 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-3">Recently Used</h3>
            <div className="space-y-1">
              {recentRecipes.map((recipe) => (
                <button
                  key={recipe._id}
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
            <div className="flex items-center gap-4 flex-wrap justify-between">
              {/* Search Input - Left Side */}
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search recipes, ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Filters - Right Side (hidden on mobile) */}
              <div className="hidden lg:flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
                {(["breakfast", "lunch", "dinner", "dessert"] as Array<MealTypeFilter>).map((cat) => {
                const item = categoryItems.find(i => i.key === cat);
                if (!item) return null;
                const isSelected = categoryFilter === cat;

                const categoryColors: Record<string, string> = {
                  breakfast: isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/70",
                  lunch: isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/70",
                  dinner: isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/70",
                  dessert: isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-900/70",
                };

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
                    className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full transition-colors ${categoryColors[cat]}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
              </div>
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
                {/* Show pending recipes first */}
                {pendingRecipes.map((pending) => (
                  <PendingRecipeRow
                    key={pending.analysisId}
                    analysisId={pending.analysisId}
                    filename={pending.filename}
                    imageUrl={pending.imageUrl}
                    uploadDate={pending.uploadDate}
                    status={pending.status}
                    title={pending.title}
                  />
                ))}

                {/* Show actual recipes */}
                {filteredAndSortedRecipes.recipes.map((recipe) => (
                  <RecipeTableRow
                    key={recipe._id}
                    recipe={recipe}
                    searchMatches={filteredAndSortedRecipes.searchResults.get(recipe._id)}
                    searchQuery={debouncedSearchQuery}
                    onToggleFavorite={toggleFavorite}
                    onDelete={deleteRecipe}
                    onRowClick={() => setSelectedRecipe(recipe)}
                    formatDate={formatDate}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Recipe Modal */}
      <AddRecipeModal open={addModalOpen} onOpenChange={setAddModalOpen} />

      {/* Full Screen Recipe Modal */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0 gap-0" showCloseButton={false}>
          {selectedRecipe && (
            <>
              {/* Compact Header with Thumbnail */}
              <div className="flex-shrink-0 border-b">
                <div className="flex gap-4 p-6">
                  {/* Thumbnail Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={selectedRecipe.imageUrl}
                      alt={selectedRecipe.title}
                      className="w-28 h-28 object-cover rounded-lg"
                    />
                  </div>

                  {/* Title and Metadata */}
                  <div className="flex-1 min-w-0">
                    <DialogHeader className="mb-3">
                      <DialogTitle className="text-2xl font-bold">
                        {selectedRecipe.title}
                      </DialogTitle>
                    </DialogHeader>

                    {/* Metadata Aside */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
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
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-start gap-2">
                    <Button
                      variant={selectedRecipe.isFavorite ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => toggleFavorite(selectedRecipe._id, e)}
                      className="cursor-pointer"
                    >
                      <Heart className={`h-4 w-4 mr-2 ${selectedRecipe.isFavorite ? "fill-current" : ""}`} />
                      {selectedRecipe.isFavorite ? "Favorited" : "Favorite"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedRecipe(null)}
                      className="cursor-pointer"
                      autoFocus
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Two-Column Content: Ingredients | Instructions */}
              <div className="flex-1 overflow-auto">
                <div className="grid lg:grid-cols-2 gap-0 h-full">
                  {/* Ingredients Column */}
                  <section className="p-6 border-r overflow-auto">
                    <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-background pb-2 border-b">
                      Ingredients
                    </h3>
                    {selectedRecipe.ingredients.length > 0 ? (
                      <ul className="space-y-2.5">
                        {selectedRecipe.ingredients.map((ingredient, index) => (
                          <li key={index} className="flex items-baseline gap-2">
                            <span className="text-primary">•</span>
                            <span>
                              {ingredient.originalString ? (
                                // Display unparsed natural language as-is
                                <span className="text-muted-foreground">{ingredient.originalString}</span>
                              ) : (
                                // Display structured ingredient with formatted quantity
                                <>
                                  <span className="font-medium">
                                    {formatQuantity(ingredient.quantity)} {ingredient.unit}
                                  </span>{" "}
                                  <span className="text-muted-foreground">{ingredient.name}</span>
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground italic">No ingredients listed</p>
                    )}
                  </section>

                  {/* Instructions Column */}
                  <section className="p-6 overflow-auto">
                    <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-background pb-2 border-b">
                      Instructions
                    </h3>
                    {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 ? (
                      <ol className="space-y-4">
                        {selectedRecipe.instructions.map((instruction, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                              {index + 1}
                            </span>
                            <span className="flex-1 pt-0.5">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-muted-foreground italic">No instructions available</p>
                    )}
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

function SearchMatchContext({
  recipe,
  matches,
}: {
  recipe: Recipe;
  matches: ReadonlyArray<FuseResultMatch>;
}) {
  // Find best match (prioritize title > ingredients > category)
  const titleMatch = matches.find(m => m.key === 'title');
  const ingredientMatch = matches.find(m => m.key === 'ingredients.name');
  const categoryMatch = matches.find(m => m.key === 'mealType');

  const bestMatch = titleMatch || ingredientMatch || categoryMatch;

  if (!bestMatch?.indices) {
    return (
      <p className="text-xs text-muted-foreground">
        {recipe.author || recipe.source}
      </p>
    );
  }

  if (bestMatch.key === 'title') {
    return (
      <p className="text-xs text-muted-foreground">
        <HighlightedText text={recipe.title} indices={bestMatch.indices} />
      </p>
    );
  }

  if (bestMatch.key === 'ingredients.name') {
    const ingredientIndex = typeof bestMatch.refIndex === 'number' ? bestMatch.refIndex : 0;
    const ingredient = recipe.ingredients[ingredientIndex];
    return (
      <p className="text-xs text-muted-foreground">
        Ingredient: <HighlightedText text={ingredient.name} indices={bestMatch.indices} />
      </p>
    );
  }

  if (bestMatch.key === 'mealType') {
    return (
      <p className="text-xs text-muted-foreground">
        Category: <HighlightedText text={recipe.mealType} indices={bestMatch.indices} />
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      {recipe.author || recipe.source}
    </p>
  );
}

function RecipeTableRow({
  recipe,
  searchMatches,
  searchQuery,
  onToggleFavorite,
  onDelete,
  onRowClick,
  formatDate,
}: {
  recipe: Recipe;
  searchMatches?: ReadonlyArray<FuseResultMatch>;
  searchQuery?: string;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  onRowClick: () => void;
  formatDate: (timestamp: number) => string;
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
          {searchQuery && searchMatches ? (
            <SearchMatchContext recipe={recipe} matches={searchMatches} />
          ) : (
            <p className="text-xs text-muted-foreground">
              {recipe.author || recipe.source}
            </p>
          )}
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
          onClick={(e) => onToggleFavorite(recipe._id, e)}
        >
          <Heart
            className={`h-4 w-4 ${recipe.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
          />
        </Button>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-8 w-8 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => onDelete(recipe._id, e)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
