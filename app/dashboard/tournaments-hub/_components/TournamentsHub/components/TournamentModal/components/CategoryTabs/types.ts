export interface CategoryTabItem {
  id: string;
  name: string;
}

export type CategoryTabsProps = {
  categories: CategoryTabItem[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
};
