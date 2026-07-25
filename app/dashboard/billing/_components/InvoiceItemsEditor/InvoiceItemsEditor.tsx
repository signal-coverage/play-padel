"use client";

import { useFieldArray, useWatch } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeRowTotal } from "./utils";
import type { InvoiceItemsEditorProps } from "./types";

export function InvoiceItemsEditor({
  control,
  errors,
}: InvoiceItemsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = useWatch({ control, name: "items" }) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>Items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ description: "", quantity: 1, unitPrice: 0, total: 0 })
          }
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add item
        </Button>
      </div>

      {errors.items && !Array.isArray(errors.items) && (
        <p className="text-xs text-destructive">{errors.items.message}</p>
      )}

      {fields.map((field, index) => {
        const qty = Number(items[index]?.quantity) || 0;
        const price = Number(items[index]?.unitPrice) || 0;
        const rowTotal = computeRowTotal(qty, price);

        return (
          <div
            key={field.id}
            className="rounded-lg border bg-card p-3 flex flex-col gap-2"
          >
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Description
              </Label>
              <Input
                {...control.register(`items.${index}.description`)}
                placeholder="Service or item"
              />
              {errors.items?.[index]?.description && (
                <p className="text-xs text-destructive">
                  {errors.items[index]?.description?.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Qty</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  {...control.register(`items.${index}.quantity`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  Unit price
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  {...control.register(`items.${index}.unitPrice`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-sm font-medium tabular-nums">
                Line total: {rowTotal.toFixed(2)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
                aria-label="Remove item"
              >
                <Trash2Icon className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
