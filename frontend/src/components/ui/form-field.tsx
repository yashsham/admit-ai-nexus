import * as React from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export interface FormFieldProps {
  label: string;
  id: string;
  type?: "text" | "email" | "password" | "tel" | "textarea";
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  success?: boolean;
  required?: boolean;
  className?: string;
}

export const FormField = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  ({ label, id, type = "text", placeholder, value, onChange, error, success, required, className }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    React.useEffect(() => {
      setHasValue(value.length > 0);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    const getStatusIcon = () => {
      if (error) return <XCircle className="w-4 h-4 text-destructive" />;
      if (success && hasValue) return <CheckCircle className="w-4 h-4 text-green-500" />;
      if (required && !hasValue) return <AlertCircle className="w-4 h-4 text-muted-foreground/50" />;
      return null;
    };

    const inputClasses = cn(
      "peer w-full px-4 py-3 border rounded-lg transition-all duration-300",
      "focus:ring-2 focus:ring-primary/20 focus:border-primary",
      "placeholder-transparent",
      error 
        ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
        : success && hasValue
        ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
        : "border-border hover:border-primary/50",
      className
    );

    const labelClasses = cn(
      "absolute left-4 transition-all duration-300 pointer-events-none",
      "text-muted-foreground",
      isFocused || hasValue
        ? "-top-2 text-xs bg-background px-1 text-primary"
        : "top-3 text-sm"
    );

    return (
      <div className="relative space-y-1">
        <div className="relative">
          {type === "textarea" ? (
            <Textarea
              ref={ref as React.RefObject<HTMLTextAreaElement>}
              id={id}
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={inputClasses}
              required={required}
              rows={4}
            />
          ) : (
            <Input
              ref={ref as React.RefObject<HTMLInputElement>}
              id={id}
              type={type}
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={inputClasses}
              required={required}
            />
          )}
          
          <Label htmlFor={id} className={labelClasses}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>

          {(error || success || required) && (
            <div className="absolute right-3 top-3 transition-all duration-300">
              {getStatusIcon()}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive flex items-center gap-2 animate-fade-in">
            <XCircle className="w-3 h-3" />
            {error}
          </p>
        )}

        {success && hasValue && !error && (
          <p className="text-sm text-green-600 flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-3 h-3" />
            Looks good!
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";