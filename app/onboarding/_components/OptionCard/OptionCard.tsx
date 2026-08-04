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
  selected,
  onClick,
}: OptionCardProps) {
  return (
    <Item asChild className={getOptionCardClassName(selected)}>
      <button type="button" onClick={onClick}>
        <ItemMedia variant="icon">
          <Icon className="mt-0.5 size-5 text-primary" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="font-semibold">{title}</ItemTitle>
          {description && (
            <ItemDescription className="text-xs">{description}</ItemDescription>
          )}
        </ItemContent>
      </button>
    </Item>
  );
}
