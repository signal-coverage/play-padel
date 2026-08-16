import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { getOptionCardClassName } from "./styles";
import type { OptionCardProps } from "./types";

export function OptionCard({
  icon: Icon,
  title,
  description,
  badge,
  selected,
  onClick,
}: OptionCardProps) {
  return (
    <Item asChild className={getOptionCardClassName(selected, !!badge)}>
      <button type="button" aria-pressed={selected} onClick={onClick}>
        <ItemMedia variant="icon">
          <Icon className="mt-0.5 size-5 text-primary" />
        </ItemMedia>
        <ItemContent>
          <div className="flex items-center gap-2">
            <ItemTitle className="font-semibold">{title}</ItemTitle>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <ItemDescription className="text-xs">{description}</ItemDescription>
          )}
        </ItemContent>
      </button>
    </Item>
  );
}
