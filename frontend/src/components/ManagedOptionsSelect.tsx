// ManagedOptionsSelect: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormSelect } from "./ui/FormControls";
import { IconButton, Tooltip } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { showConfirm, showPrompt } from "../services/dialogService";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================
// DESIGN: ManagedOptionsSelect
// Hanapin: BASE CSS, CLASS NAMES, THEME, MOBILE, at LAYOUT.

// Design for ManagedOptionsSelect.
// BASE CSS: Pangunahing design ng component.
const managedOptionsSelectCss = `/* ManagedOptionsSelect.module.css */
.mui-managedoptionsselect-container { display: flex; align-items: center; width: 100%; gap: .375rem; }
.mui-managedoptionsselect-select { min-width: 0; flex: 1; }
.mui-managedoptionsselect-alignLeft { text-align: left; text-align-last: left; }
.mui-managedoptionsselect-alignRight { text-align: right; text-align-last: right; }
.mui-managedoptionsselect-actionButton, .mui-managedoptionsselect-colorButton { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: .5rem; background: #fff; border: 1px solid #d4d4d8; border-radius: .375rem; cursor: pointer; }
.mui-managedoptionsselect-addButton { color: #059669; } .mui-managedoptionsselect-addButton:hover { background: #ecfdf5; }
.mui-managedoptionsselect-editButton { color: #3f3f46; } .mui-managedoptionsselect-editButton:hover { background: #fafafa; }
.mui-managedoptionsselect-paletteButton { color: #7c3aed; } .mui-managedoptionsselect-paletteButton:hover { background: #f5f3ff; }
.mui-managedoptionsselect-deleteButton { color: #dc2626; } .mui-managedoptionsselect-deleteButton:hover { background: #fef2f2; }
.mui-managedoptionsselect-actionButton:disabled { cursor: not-allowed; opacity: .4; }
.mui-managedoptionsselect-paletteContainer { position: relative; }
.mui-managedoptionsselect-palette { position: absolute; top: 100%; right: 0; z-index: 50; display: flex; gap: .25rem; margin-top: .25rem; padding: .5rem; background: #fff; border: 1px solid #e4e4e7; border-radius: .5rem; box-shadow: 0 .75rem 2rem rgb(15 23 42 / 18%); }
.mui-managedoptionsselect-colorButton { padding: .375rem; border: 0; font-size: 1.125rem; }
.mui-managedoptionsselect-colorButton:hover { background: #f4f4f5; }
.dark .mui-managedoptionsselect-actionButton, .dark .mui-managedoptionsselect-palette { background: #18181b; border-color: #3f3f46; }
.dark .mui-managedoptionsselect-colorButton { background: transparent; }
.dark .mui-managedoptionsselect-colorButton:hover { background: #27272a; }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const managedOptionsSelectStyles = {
  actionButton: "mui-managedoptionsselect-actionButton",
  addButton: "mui-managedoptionsselect-addButton",
  alignLeft: "mui-managedoptionsselect-alignLeft",
  alignRight: "mui-managedoptionsselect-alignRight",
  colorButton: "mui-managedoptionsselect-colorButton",
  container: "mui-managedoptionsselect-container",
  deleteButton: "mui-managedoptionsselect-deleteButton",
  editButton: "mui-managedoptionsselect-editButton",
  palette: "mui-managedoptionsselect-palette",
  paletteButton: "mui-managedoptionsselect-paletteButton",
  paletteContainer: "mui-managedoptionsselect-paletteContainer",
  select: "mui-managedoptionsselect-select",
} as const;
const styles = managedOptionsSelectStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
export type ManagedOption = { value: string; label: string; colorDot?: string };

const COLOR_DOTS = ["🔵", "🟣", "🟢", "🔴", "🟠", "🟡"];

const normalizeOption = (
  option: unknown,
  index: number,
): ManagedOption | null => {
  if (typeof option === "string") {
    const label = option.trim();
    return label ? { value: label, label } : null;
  }

  if (!option || typeof option !== "object") return null;
  const candidate = option as Partial<ManagedOption>;
  const label =
    typeof candidate.label === "string" ? candidate.label.trim() : "";
  const value =
    typeof candidate.value === "string" ? candidate.value.trim() : "";
  if (!label && !value) return null;

  return {
    value: value || label || `OPTION_${index + 1}`,
    label: label || value,
    colorDot:
      typeof candidate.colorDot === "string" ? candidate.colorDot : undefined,
  };
};

interface ManagedOptionsSelectProps {
  storageKey: string;
  options: ManagedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  colorCoding?: boolean;
  canManageOptions?: boolean;
  textAlign?: "left" | "right";
}

const makeValue = (label: string, existing: ManagedOption[]) => {
  const base =
    label
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `OPTION_${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (existing.some((option) => option.value === candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  return candidate;
};

// LOGIC: State, events, at pagproseso ng data.
export const ManagedOptionsSelect: React.FC<ManagedOptionsSelectProps> = ({
  storageKey,
  options: defaults,
  value,
  onChange,
  className,
  required,
  colorCoding = false,
  canManageOptions = false,
  textAlign = "right",
}) => {
  const [options, setOptions] = useState<ManagedOption[]>(defaults);
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          const normalized = parsed
            .map(normalizeOption)
            .filter((option): option is ManagedOption => option !== null)
            .map((option, index) => ({
              ...option,
              label: option.label.replace(/^[🔵🟣🟢🔴🟠🟡]\s*/u, ""),
              colorDot: colorCoding
                ? option.colorDot || COLOR_DOTS[index % COLOR_DOTS.length]
                : undefined,
            }));
          if (!normalized.length) return;
          setOptions(normalized);
          localStorage.setItem(storageKey, JSON.stringify(normalized));
        }
      }
    } catch {
      setOptions(defaults);
    }
  }, [storageKey, colorCoding]);

  const persist = (next: ManagedOption[]) => {
    setOptions(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const addOption = async () => {
    const label = (await showPrompt("Enter the new option:"))?.trim();
    if (!label) return;
    const nextOption = {
      value: makeValue(label, options),
      label,
      colorDot: colorCoding
        ? COLOR_DOTS[options.length % COLOR_DOTS.length]
        : undefined,
    };
    persist([...options, nextOption]);
    onChange(nextOption.value);
  };

  const editOption = async () => {
    const selected = options.find((option) => option.value === value);
    if (!selected) return;
    const label = (
      await showPrompt("Edit this option:", selected.label)
    )?.trim();
    if (!label) return;
    persist(
      options.map((option) =>
        option.value === selected.value ? { ...option, label } : option,
      ),
    );
  };

  const deleteOption = async () => {
    if (options.length <= 1) return;
    const selected = options.find((option) => option.value === value);
    if (!selected || !(await showConfirm(`Delete “${selected.label}”?`)))
      return;
    const next = options.filter((option) => option.value !== selected.value);
    persist(next);
    onChange(next[0].value);
  };

  const setSelectedColor = (colorDot: string) => {
    const selected = options.find((option) => option.value === value);
    if (!selected) return;
    persist(
      options.map((option) =>
        option.value === selected.value ? { ...option, colorDot } : option,
      ),
    );
    setShowPalette(false);
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <ManagedOptionsSelectDesign />
      {
        <div className={styles.container}>
          <FormSelect
            required={required}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${styles.select} ${className || ""} ${textAlign === "left" ? styles.alignLeft : styles.alignRight}`}
          >
            {options.map((option, index) => (
              <option key={option.value} value={option.value}>
                {colorCoding
                  ? `${option.colorDot || COLOR_DOTS[index % COLOR_DOTS.length]} ${option.label}`
                  : option.label}
              </option>
            ))}
          </FormSelect>
          {canManageOptions && (
            <Tooltip title="Add option">
              <IconButton
                type="button"
                onClick={addOption}
                aria-label="Add option"
                size="small"
                className={`${styles.actionButton} ${styles.addButton}`}
              >
                <Plus size={16} />
              </IconButton>
            </Tooltip>
          )}
          {canManageOptions && (
            <Tooltip title="Edit selected option">
              <IconButton
                type="button"
                onClick={editOption}
                aria-label="Edit selected option"
                size="small"
                className={`${styles.actionButton} ${styles.editButton}`}
              >
                <Pencil size={16} />
              </IconButton>
            </Tooltip>
          )}
          {canManageOptions && colorCoding && (
            <div className={styles.paletteContainer}>
              <Tooltip title="Choose selected color">
                <IconButton
                  type="button"
                  onClick={() => setShowPalette((open) => !open)}
                  aria-label="Choose selected color"
                  size="small"
                  className={`${styles.actionButton} ${styles.paletteButton}`}
                >
                  <Palette size={16} />
                </IconButton>
              </Tooltip>
              {showPalette && (
                <div className={styles.palette}>
                  {COLOR_DOTS.map((dot) => (
                    <IconButton
                      key={dot}
                      type="button"
                      onClick={() => setSelectedColor(dot)}
                      aria-label={`Use ${dot} color`}
                      size="small"
                      className={styles.colorButton}
                    >
                      {dot}
                    </IconButton>
                  ))}
                </div>
              )}
            </div>
          )}
          {canManageOptions && (
            <Tooltip title="Delete selected option">
              <IconButton
                type="button"
                onClick={deleteOption}
                disabled={options.length <= 1}
                aria-label="Delete selected option"
                size="small"
                className={`${styles.actionButton} ${styles.deleteButton}`}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function ManagedOptionsSelectDesign() {
  const theme = useComponentTheme();
  return <ComponentGlobalStyles styles={[managedOptionsSelectCss]} />;
}
