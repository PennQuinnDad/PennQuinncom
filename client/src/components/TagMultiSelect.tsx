import * as React from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TagMultiSelectProps {
  available: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  noun?: string;
  testIdPrefix?: string;
}

export function TagMultiSelect({
  available,
  selected,
  onChange,
  placeholder = 'Select or create...',
  noun = 'item',
  testIdPrefix = 'tag-multiselect',
}: TagMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const lowerSelected = React.useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected]
  );

  const filteredAvailable = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return available
      .filter((t) => !lowerSelected.has(t.toLowerCase()))
      .filter((t) => !q || t.toLowerCase().includes(q));
  }, [available, lowerSelected, search]);

  const trimmed = search.trim();
  const canCreate =
    trimmed.length > 0 &&
    !available.some((t) => t.toLowerCase() === trimmed.toLowerCase()) &&
    !lowerSelected.has(trimmed.toLowerCase());

  const add = (item: string) => {
    onChange([...selected, item]);
    setSearch('');
  };

  const remove = (item: string) => {
    onChange(selected.filter((s) => s !== item));
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            data-testid={`${testIdPrefix}-trigger`}
          >
            <span className={selected.length === 0 ? 'text-muted-foreground' : undefined}>
              {selected.length === 0
                ? placeholder
                : `${selected.length} ${noun}${selected.length === 1 ? '' : 's'} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search or create ${noun}...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {!canCreate && filteredAvailable.length === 0 && (
                <CommandEmpty>No matches</CommandEmpty>
              )}
              {canCreate && (
                <CommandGroup heading="Create">
                  <CommandItem
                    value={`__create__:${trimmed}`}
                    onSelect={() => add(trimmed)}
                    data-testid={`${testIdPrefix}-create`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create &ldquo;{trimmed}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
              {filteredAvailable.length > 0 && (
                <CommandGroup heading={available.length > 0 ? 'Existing' : undefined}>
                  {filteredAvailable.map((item) => (
                    <CommandItem
                      key={item}
                      value={item}
                      onSelect={() => add(item)}
                      data-testid={`${testIdPrefix}-option-${item}`}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          lowerSelected.has(item.toLowerCase()) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {item}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="pl-2 pr-1 py-0.5 gap-1"
              data-testid={`${testIdPrefix}-badge-${item}`}
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                aria-label={`Remove ${item}`}
                data-testid={`${testIdPrefix}-remove-${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
