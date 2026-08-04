"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

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

export function SearchableSelect({
  value,
  onValueChange,
  onSearch,
  placeholder = "Select...",
  displayValue,
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SearchableSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState<string | undefined>(
    undefined,
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  /** Tracks which value id has already been resolved to avoid redundant fetches. */
  const resolvedIdRef = useRef<string | undefined>(undefined);
  /** Always-current reference to onSearch so effects don't need it in deps. */
  const onSearchRef = useRef(onSearch);
  // Ref writes must happen outside render; this keeps onSearchRef "always
  // current" without reading/writing `.current` during the render itself.
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // When the value prop changes and we don't have a label for it yet, resolve it.
  useEffect(() => {
    if (resolvedIdRef.current === value) return;

    if (!value) {
      // No state to sync here — `label` below derives to undefined whenever
      // `value` is falsy, so we only need to mark this (empty) id as synced.
      resolvedIdRef.current = value;
      return;
    }

    onSearchRef
      .current("")
      .then((results) => {
        const found = results.find((r) => r.id === value);
        if (found) setResolvedLabel(found.label);
        resolvedIdRef.current = value;
      })
      .catch(() => {
        resolvedIdRef.current = value;
      });
  }, [value]);

  // Load initial results whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    // Kicks off an async fetch and tracks its loading state — the
    // recognized "start fetching, subscribe to its result" effect pattern,
    // not a response to a state change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    onSearchRef
      .current("")
      .then((results) => {
        setOptions(results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  function handleSearchChange(query: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      onSearchRef
        .current(query)
        .then((results) => {
          setOptions(results);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);
  }

  function handleSelect(option: SearchableSelectOption) {
    setResolvedLabel(option.label);
    resolvedIdRef.current = option.id;
    onValueChange(option.id);
    setOpen(false);
  }

  // displayValue prop takes precedence; fall back to the resolved label.
  // (resolvedLabel is only meaningful once `value` is non-empty — see the
  // resolve effect above.)
  const label = displayValue ?? (value ? resolvedLabel : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
            "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !label && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{label ?? placeholder}</span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Searching...</CommandEmpty>
            ) : options.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => handleSelect(option)}
                    data-checked={option.id === value}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
