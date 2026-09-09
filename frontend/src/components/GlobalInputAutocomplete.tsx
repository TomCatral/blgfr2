// GlobalInputAutocomplete: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { createPortal } from "react-dom";
import { Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import { History } from "lucide-react";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================
// DESIGN: GlobalInputAutocomplete
// Hanapin: BASE CSS, CLASS NAMES, THEME, MOBILE, at LAYOUT.

// Design for GlobalInputAutocomplete.
// BASE CSS: Pangunahing design ng component.
const globalInputAutocompleteCss = `/* GlobalInputAutocomplete.module.css */
.mui-globalinputautocomplete-menu { position: fixed; z-index: 120; overflow: hidden; padding: .5rem 0; background: #fff; border: 1px solid #e4e4e7; border-radius: .75rem; box-shadow: 0 .5rem 1.5rem rgb(60 64 67 / 22%); }
.mui-globalinputautocomplete-option { display: flex; align-items: center; width: 100%; gap: .75rem; padding: .625rem 1rem; color: #27272a; background: transparent; border: 0; cursor: pointer; font-size: .875rem; text-align: left; }
.mui-globalinputautocomplete-activeOption { color: #020617; background: #f4f4f5; }
.mui-globalinputautocomplete-historyIcon { flex-shrink: 0; width: 1rem; height: 1rem; color: #a1a1aa; }
.mui-globalinputautocomplete-optionText { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dark .mui-globalinputautocomplete-menu { background: #18181b; border-color: #3f3f46; }
.dark .mui-globalinputautocomplete-option { color: #f4f4f5; }
.dark .mui-globalinputautocomplete-activeOption { color: #fff; background: #27272a; }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const globalInputAutocompleteStyles = {
  activeOption: "mui-globalinputautocomplete-activeOption",
  historyIcon: "mui-globalinputautocomplete-historyIcon",
  menu: "mui-globalinputautocomplete-menu",
  option: "mui-globalinputautocomplete-option",
  optionText: "mui-globalinputautocomplete-optionText",
} as const;
const styles = globalInputAutocompleteStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
type EligibleElement = HTMLInputElement | HTMLTextAreaElement;

const STORAGE_KEY = "blgf_input_history_v1";

const MAX_FIELD_HISTORY = 30;

const isEligible = (
  element: EventTarget | null,
): element is EligibleElement => {
  if (!(
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  )) {
    return false;
  }
  if (
    element.dataset.autocompleteManaged === "true" ||
    element.disabled ||
    element.readOnly
  ) {
    return false;
  }
  if (element instanceof HTMLTextAreaElement) return true;
  return ["text", "search", "email", "tel", "url"].includes(
    element.type || "text",
  );
};

const fieldKey = (element: EligibleElement) => {
  const nearbyLabel =
    element.labels?.[0]?.textContent ||
    element.parentElement?.querySelector("label")?.textContent ||
    "";
  return (
    [
      element.name,
      element.id,
      element.getAttribute("aria-label"),
      nearbyLabel,
      element.placeholder,
    ]
      .find((value) => value?.trim())
      ?.trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, " ") || "general-text"
  );
};

const loadHistory = (): Record<string, string[]> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const setNativeValue = (element: EligibleElement, value: string) => {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
    element,
    value,
  );
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: value,
    }),
  );
};

const executeEnterAction = (element: EligibleElement) => {
  window.setTimeout(() => {
    if (element.form) {
      element.form.requestSubmit();
      return;
    }
    element.dataset.autocompleteEnterPending = "true";
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
  }, 0);
};

// LOGIC: State, events, at pagproseso ng data.
export const GlobalInputAutocomplete: React.FC = () => {
  const [target, setTarget] = useState<EligibleElement | null>(null);
  const [matches, setMatches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0 });

  useEffect(() => {
    const updatePosition = (element: EligibleElement) => {
      const rect = element.getBoundingClientRect();
      setPosition({ left: rect.left, top: rect.bottom + 4, width: rect.width });
    };
    const refresh = (element: EligibleElement) => {
      const query = element.value.trim().toLocaleLowerCase();
      const history = loadHistory()[fieldKey(element)] || [];
      setMatches(
        query
          ? history
              .filter(
                (item) =>
                  item.toLocaleLowerCase() !== query &&
                  item.toLocaleLowerCase().includes(query),
              )
              .slice(0, 7)
          : [],
      );
      setActiveIndex(0);
      updatePosition(element);
    };
    const save = (element: EligibleElement) => {
      const value = element.value.trim();
      if (!value) return;
      const history = loadHistory();
      const key = fieldKey(element);
      history[key] = [
        value,
        ...(history[key] || []).filter(
          (item) => item.toLocaleLowerCase() !== value.toLocaleLowerCase(),
        ),
      ].slice(0, MAX_FIELD_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    };
    const onFocus = (event: FocusEvent) => {
      if (!isEligible(event.target)) return;
      setTarget(event.target);
      refresh(event.target);
    };
    const onInput = (event: Event) => {
      if (isEligible(event.target)) refresh(event.target);
    };
    const onBlur = (event: FocusEvent) => {
      if (!isEligible(event.target)) return;
      save(event.target);
      window.setTimeout(() => {
        setTarget((current) => (current === event.target ? null : current));
        setMatches([]);
      }, 120);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isEligible(event.target) &&
        event.target.dataset.autocompleteEnterPending === "true"
      ) {
        delete event.target.dataset.autocompleteEnterPending;
        return;
      }
      if (!target || matches.length === 0 || event.target !== target) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % matches.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (current) => (current - 1 + matches.length) % matches.length,
        );
      } else if (event.key === "Enter" || event.key === "Tab") {
        if (event.key === "Enter") event.preventDefault();
        setNativeValue(target, matches[activeIndex] || matches[0]);
        setMatches([]);
        if (event.key === "Enter") executeEnterAction(target);
      } else if (event.key === "Escape") {
        setMatches([]);
      }
    };
    const reposition = () => target && updatePosition(target);

    document.addEventListener("focusin", onFocus);
    document.addEventListener("input", onInput);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("input", onInput);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [target, matches, activeIndex]);

  if (!target || matches.length === 0) return null;

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <GlobalInputAutocompleteDesign />
      {createPortal(
        <div
          className={styles.menu}
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
          }}
        >
          {matches.map((item, index) => (
            <Button
              key={item.toLocaleLowerCase()}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                setNativeValue(target, item);
                setMatches([]);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`${styles.option} ${index === activeIndex ? styles.activeOption : ""}`}
            >
              <History className={styles.historyIcon} />
              <span className={styles.optionText}>{item}</span>
            </Button>
          ))}
        </div>,
        target.closest(".mui-systemdesign-system") || document.body,
      )}
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function GlobalInputAutocompleteDesign() {
  const theme = useComponentTheme();
  return <ComponentGlobalStyles styles={[globalInputAutocompleteCss]} />;
}
