// Dropdown.jsx
import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";

export default function Dropdown({
  options = [],        // [{ value, label }]
  value,
  onChange,
  placeholder = "Pilih...",
  style,              // ex: { width: 300 } kalau mau samain sample lama
  disabled = false,
  searchable = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const id = useId();

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find((o) => o.value === value);

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((o) => o.label && String(o.label).toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : options;

  // Update posisi dropdown berdasarkan trigger button
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        const portalEl = document.getElementById(`portal-${id}`);
        if (portalEl && portalEl.contains(e.target)) {
          return;
        }
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [id]);

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      if (searchable) {
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 50);
      }
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open, searchable]);

  function openList() {
    if (disabled) return;
    updateCoords();
    setSearchQuery("");
    setOpen(true);
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
  }

  function selectOption(opt) {
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (disabled) return;
    if (!open && ["Enter", " ", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        selectOption(filteredOptions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="custom-select-container" ref={containerRef} style={style}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`custom-select-trigger${open ? " active" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        disabled={disabled}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          className="dropdown-chevron"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: 8 }}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            id={`portal-${id}`}
            className="custom-select-dropdown"
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              margin: 0,
              padding: 0,
              zIndex: 99999,
              overflow: "hidden",
            }}
          >
            {searchable && (
              <div style={{ padding: "8px", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ketik untuk mencari..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onKeyDown}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    fontSize: "13px",
                    borderRadius: "var(--radius-sm, 4px)",
                    border: "1px solid var(--border, #d1d5db)",
                    backgroundColor: "var(--bg, #fff)",
                    color: "var(--text, #111827)",
                    outline: "none"
                  }}
                />
              </div>
            )}
            <ul
              role="listbox"
              aria-labelledby={id}
              style={{
                margin: 0,
                padding: "4px 0",
                listStyle: "none",
                maxHeight: "220px",
                overflowY: "auto"
              }}
            >
              {filteredOptions.length === 0 ? (
                <li style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-muted, #6b7280)", fontSize: "13px" }}>
                  Tidak ada hasil
                </li>
              ) : (
                filteredOptions.map((opt, i) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    tabIndex={-1}
                    className={`custom-select-option${opt.value === value ? " selected" : ""}${
                      i === activeIndex ? " hovered" : ""
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => selectOption(opt)}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}