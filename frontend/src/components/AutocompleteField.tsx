// AutocompleteField: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import { Button } from "@mui/material";
import React, { useMemo, useRef, useState } from "react";
import { CornerDownLeft, History } from "lucide-react";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================
// DESIGN: AutocompleteField
// Hanapin: BASE CSS, CLASS NAMES, THEME, MOBILE, at LAYOUT.

// Design for AutocompleteField.
// BASE CSS: Pangunahing design ng component.
const autocompleteFieldCss = `/* AutocompleteField.module.css */
.mui-autocompletefield-container { position: relative; }
.mui-autocompletefield-control::selection { color: #fff; background: #3f3f46; }
.mui-autocompletefield-menu { position: absolute; top: 100%; right: 0; left: 0; z-index: 80; max-height: 18rem; margin-top: .25rem; overflow-y: auto; padding: .5rem 0; background: #fff; border: 1px solid #e4e4e7; border-radius: .75rem; box-shadow: 0 .5rem 1.5rem rgb(60 64 67 / 22%); }
.mui-autocompletefield-option { display: flex; align-items: center; width: 100%; gap: .75rem; padding: .625rem 1rem; color: #27272a; background: transparent; border: 0; cursor: pointer; font-size: .875rem; text-align: left; transition: background-color 150ms ease, color 150ms ease; }
.mui-autocompletefield-option:hover, .mui-autocompletefield-activeOption { color: #020617; background: #f4f4f5; }
.mui-autocompletefield-historyIcon { flex-shrink: 0; width: 1rem; height: 1rem; color: #a1a1aa; }
.mui-autocompletefield-suggestion { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mui-autocompletefield-highlight { color: #020617; background: transparent; font-weight: 900; }
.mui-autocompletefield-hint { display: flex; align-items: center; justify-content: flex-end; gap: .25rem; margin-top: .25rem; padding: .5rem 1rem 0; color: #a1a1aa; border-top: 1px solid #f4f4f5; font-size: .625rem; font-weight: 500; }
.dark .mui-autocompletefield-menu { background: #18181b; border-color: #3f3f46; }
.dark .mui-autocompletefield-option { color: #f4f4f5; }
.dark .mui-autocompletefield-option:hover, .dark .mui-autocompletefield-activeOption { color: #fff; background: #27272a; }
.dark .mui-autocompletefield-highlight { color: #fff; }
.dark .mui-autocompletefield-hint { color: #71717a; border-color: #27272a; }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const autocompleteFieldStyles = {
  activeOption: "mui-autocompletefield-activeOption",
  container: "mui-autocompletefield-container",
  control: "mui-autocompletefield-control",
  highlight: "mui-autocompletefield-highlight",
  hint: "mui-autocompletefield-hint",
  historyIcon: "mui-autocompletefield-historyIcon",
  menu: "mui-autocompletefield-menu",
  option: "mui-autocompletefield-option",
  suggestion: "mui-autocompletefield-suggestion",
} as const;
const styles = autocompleteFieldStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface AutocompleteFieldProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  ariaLabel?: string;
}

const highlightMatch = (text: string, query: string) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const parts = text.split(
    new RegExp(
      `(${normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    ),
  );

  return parts.map((part, index) =>
    part.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase() ? (
      <mark key={`${part}-${index}`} className={styles.highlight}>
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    ),
  );
};

// LOGIC: State, events, at pagproseso ng data.
export const AutocompleteField: React.FC<AutocompleteFieldProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  required,
  multiline = false,
  rows = 2,
  className = "",
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchText, setSearchText] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const hasInlinePreview = useRef(false);

  const matches = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    if (!query) return [];
    const seen = new Set<string>();
    return suggestions
      .map((item) => String(item || "").trim())
      .filter((item) => {
        const normalized = item.toLocaleLowerCase();
        if (!item || seen.has(normalized) || normalized === query) return false;
        seen.add(normalized);
        return normalized.includes(query);
      })
      .slice(0, 7);
  }, [suggestions, searchText]);

  const choose = (suggestion: string) => {
    hasInlinePreview.current = false;
    onChange(suggestion);
    setSearchText(suggestion);
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!isOpen || matches.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (current) => (current - 1 + matches.length) % matches.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(matches[activeIndex] || matches[0]);
    } else if (event.key === "Tab") {
      // Keep the browser's normal Tab navigation after completing the value.
      choose(matches[activeIndex] || matches[0]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const commonProps = {
    required,
    value,
    placeholder,
    "aria-label": ariaLabel,
    "aria-autocomplete": "list" as const,
    "aria-expanded": isOpen && matches.length > 0,
    autoComplete: "off",
    "data-autocomplete-managed": "true",
    className: `${styles.control} ${className}`,
    onFocus: () => {
      setSearchText(value);
      setActiveIndex(0);
      setIsOpen(true);
    },
    onBlur: () => {
      if (hasInlinePreview.current) {
        onChange(searchText);
        hasInlinePreview.current = false;
      }
      setIsOpen(false);
    },
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const typedValue = event.target.value;
      const inputType = (event.nativeEvent as InputEvent | undefined)
        ?.inputType;
      const isDeleting = inputType?.startsWith("delete");
      setSearchText(typedValue);
      setActiveIndex(0);
      setIsOpen(true);
      const normalizedTypedValue = typedValue.trim().toLocaleLowerCase();
      const inlineMatch =
        normalizedTypedValue &&
        suggestions.find((suggestion) => {
          const candidate = String(suggestion || "").trim();
          return (
            candidate.toLocaleLowerCase().startsWith(normalizedTypedValue) &&
            candidate.toLocaleLowerCase() !== normalizedTypedValue
          );
        });

      if (inlineMatch && !isDeleting) {
        const completedValue = String(inlineMatch).trim();
        hasInlinePreview.current = true;
        onChange(completedValue);
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(
            typedValue.length,
            completedValue.length,
          );
        });
      } else {
        hasInlinePreview.current = false;
        onChange(typedValue);
      }
    },
    onKeyDown: handleKeyDown,
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <AutocompleteFieldDesign />
      {
        <div className={styles.container}>
          {multiline ? (
            <FormTextarea
              {...commonProps}
              ref={(element) => {
                inputRef.current = element;
              }}
              rows={rows}
            />
          ) : (
            <FormInput
              {...commonProps}
              ref={(element) => {
                inputRef.current = element;
              }}
            />
          )}
          {isOpen && matches.length > 0 && (
            <div role="listbox" className={styles.menu}>
              <div>
                {matches.map((suggestion, index) => (
                  <Button
                    key={suggestion.toLocaleLowerCase()}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(suggestion);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`${styles.option} ${index === activeIndex ? styles.activeOption : ""}`}
                  >
                    <History className={styles.historyIcon} />

                    <span className={styles.suggestion}>
                      {highlightMatch(suggestion, searchText)}
                    </span>
                  </Button>
                ))}
              </div>
              <div className={styles.hint}>
                <CornerDownLeft size={12} />
                Tab or Enter to complete
              </div>
            </div>
          )}
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function AutocompleteFieldDesign() {
  const theme = useComponentTheme();
  return <ComponentGlobalStyles styles={[autocompleteFieldCss]} />;
}
