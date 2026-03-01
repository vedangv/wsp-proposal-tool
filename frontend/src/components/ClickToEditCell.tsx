import { useState, useRef, useEffect } from "react";

interface ClickToEditCellProps {
  value: number;
  onSave: (value: number) => void;
  className?: string;
}

export default function ClickToEditCell({ value, onSave, className = "" }: ClickToEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const num = parseFloat(localValue) || 0;
    if (num !== value) {
      onSave(num);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setLocalValue(String(value));
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        className={`border border-blue-400 rounded px-1 py-0.5 text-xs w-16 text-right bg-white outline-none ${className}`}
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setLocalValue(String(value));
        setEditing(true);
      }}
      className={`cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-all
        ${flash ? "ring-2 ring-emerald-400 bg-emerald-50" : ""}
        ${className}`}
    >
      {value || 0}
    </span>
  );
}
