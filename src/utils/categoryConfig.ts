export interface CategoryConfig {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
  dotColor: string;
}

export const categoryColors: Record<string, CategoryConfig> = {
  Work: {
    name: "Work",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    hoverBg: "hover:bg-blue-500/20",
    dotColor: "bg-blue-500",
  },
  Personal: {
    name: "Personal",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    hoverBg: "hover:bg-purple-500/20",
    dotColor: "bg-purple-500",
  },
  Home: {
    name: "Home",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    hoverBg: "hover:bg-green-500/20",
    dotColor: "bg-green-500",
  },
  Shopping: {
    name: "Shopping",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    hoverBg: "hover:bg-orange-500/20",
    dotColor: "bg-orange-500",
  },
  Health: {
    name: "Health",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    hoverBg: "hover:bg-rose-500/20",
    dotColor: "bg-rose-500",
  },
  Finance: {
    name: "Finance",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    hoverBg: "hover:bg-yellow-500/20",
    dotColor: "bg-yellow-500",
  },
};

// Color palette for custom categories (avoiding colors already used above)
const customColorPalette: Omit<CategoryConfig, 'name'>[] = [
  {
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    hoverBg: "hover:bg-sky-500/20",
    dotColor: "bg-sky-500",
  },
  {
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    hoverBg: "hover:bg-pink-500/20",
    dotColor: "bg-pink-500",
  },
  {
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    hoverBg: "hover:bg-indigo-500/20",
    dotColor: "bg-indigo-500",
  },
  {
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
    hoverBg: "hover:bg-teal-500/20",
    dotColor: "bg-teal-500",
  },
  {
    color: "text-lime-600 dark:text-lime-400",
    bgColor: "bg-lime-500/10",
    borderColor: "border-lime-500/30",
    hoverBg: "hover:bg-lime-500/20",
    dotColor: "bg-lime-500",
  },
  {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    hoverBg: "hover:bg-amber-500/20",
    dotColor: "bg-amber-500",
  },
  {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    hoverBg: "hover:bg-red-500/20",
    dotColor: "bg-red-500",
  },
  {
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    hoverBg: "hover:bg-cyan-500/20",
    dotColor: "bg-cyan-500",
  },
  {
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bgColor: "bg-fuchsia-500/10",
    borderColor: "border-fuchsia-500/30",
    hoverBg: "hover:bg-fuchsia-500/20",
    dotColor: "bg-fuchsia-500",
  },
  {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    hoverBg: "hover:bg-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
];

// Store for custom category colors
let customCategoryColors: Record<string, CategoryConfig> = {};

// Load custom colors from localStorage
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('offtasks-custom-category-colors');
  if (saved) {
    customCategoryColors = JSON.parse(saved);
  }
}

// Save custom colors to localStorage
const saveCustomColors = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('offtasks-custom-category-colors', JSON.stringify(customCategoryColors));
  }
};

export const getCategoryConfig = (categoryName?: string): CategoryConfig | null => {
  if (!categoryName) return null;
  
  // Check predefined categories first
  if (categoryColors[categoryName]) {
    return categoryColors[categoryName];
  }
  
  // Check custom categories
  if (customCategoryColors[categoryName]) {
    return customCategoryColors[categoryName];
  }
  
  // Create a new custom category color
  const customCategoryCount = Object.keys(customCategoryColors).length;
  const colorIndex = customCategoryCount % customColorPalette.length;
  const newConfig: CategoryConfig = {
    name: categoryName,
    ...customColorPalette[colorIndex],
  };
  
  customCategoryColors[categoryName] = newConfig;
  saveCustomColors();
  
  return newConfig;
};

export const getDefaultCategoryColor = (): CategoryConfig => ({
  name: "Custom",
  color: "text-sky-600 dark:text-sky-400",
  bgColor: "bg-sky-500/10",
  borderColor: "border-sky-500/30",
  hoverBg: "hover:bg-sky-500/20",
  dotColor: "bg-sky-500",
});
