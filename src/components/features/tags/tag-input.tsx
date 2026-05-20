"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TagChips } from "@/components/features/tags/tag-chips";
import { TAG_OPTIONS_BY_CATEGORY, dedupeTags, getTagKey, type SelectedTag } from "@/lib/tags";

type TagInputProps = {
  value: SelectedTag[];
  onChange: (tags: SelectedTag[]) => void;
  description?: string;
};

function parseTagKey(value: string): SelectedTag | null {
  const [category, tagValue] = value.split(":");
  if (!category || !tagValue) {
    return null;
  }

  if (category !== "SECTEUR" && category !== "MONTANT" && category !== "LOCALISATION") {
    return null;
  }

  return { category, value: tagValue };
}

export function TagInput({ value, onChange, description }: TagInputProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectedKeys = new Set(value.map(getTagKey));
  const availableOptions = TAG_OPTIONS_BY_CATEGORY.flatMap((group) => group.options).filter((option) => !selectedKeys.has(getTagKey(option)));

  function addTag(tag: SelectedTag) {
    onChange(dedupeTags([...value, tag]));
    setSheetOpen(false);
  }

  function removeTag(tag: SelectedTag) {
    const keyToRemove = getTagKey(tag);
    onChange(value.filter((item) => getTagKey(item) !== keyToRemove));
  }

  function handleSelect(selected: string | null) {
    if (!selected) {
      return;
    }

    const tag = parseTagKey(selected);
    if (tag) {
      addTag(tag);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <h2 className="font-semibold">Tags</h2>
        <p className="text-sm text-muted-foreground">
          {description ?? "Ajoutez des tags pour préciser vos secteurs, montants et localisations."}
        </p>
      </div>

      <TagChips tags={value} interactive={false} removable onRemove={removeTag} />

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun tag ajouté pour le moment.</p>
      ) : null}

      <div className="sm:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger render={<Button type="button" variant="outline" className="min-h-11 w-full" />}>
            + Ajouter un tag
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Ajouter un tag</SheetTitle>
              <SheetDescription>Sélectionnez une option disponible.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 p-4 pt-0">
              {TAG_OPTIONS_BY_CATEGORY.map((group) => (
                <div key={group.category} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
                  <div className="grid gap-2">
                    {group.options.map((option) => {
                      const disabled = selectedKeys.has(getTagKey(option));
                      return (
                        <Button
                          key={getTagKey(option)}
                          type="button"
                          variant="outline"
                          disabled={disabled}
                          className="min-h-11 justify-start"
                          onClick={() => addTag(option)}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden sm:block">
        <Select value="" onValueChange={handleSelect}>
          <SelectTrigger className="min-h-11 w-full">
            <SelectValue placeholder="+ Ajouter un tag" />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.length === 0 ? (
              <SelectItem value="aucun-tag-disponible" disabled>
                Tous les tags sont ajoutés
              </SelectItem>
            ) : null}
            {TAG_OPTIONS_BY_CATEGORY.map((group) =>
              group.options.map((option) => {
                const disabled = selectedKeys.has(getTagKey(option));
                return (
                  <SelectItem key={getTagKey(option)} value={getTagKey(option)} disabled={disabled}>
                    {group.label} — {option.label}
                  </SelectItem>
                );
              }),
            )}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
