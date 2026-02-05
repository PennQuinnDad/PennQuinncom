import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  "data-testid"?: string;
}

export const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(
  ({ className, value, onChange, onClear, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && value !== "";

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn(hasValue && "pr-8", className)}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid={props["data-testid"] ? `${props["data-testid"]}-clear` : "clear-input"}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

ClearableInput.displayName = "ClearableInput";
