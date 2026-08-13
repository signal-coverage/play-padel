export interface SearchableSelectOption {
  id: string;
  label: string;
}

export interface SearchableSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  onSearch: (query: string) => Promise<SearchableSelectOption[]>;
  placeholder?: string;
  /** Override the displayed label for the current value (e.g. pass "None" when value is ""). */
  displayValue?: string;
  disabled?: boolean;
  className?: string;
}
