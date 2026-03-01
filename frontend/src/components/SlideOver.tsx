import { useEffect, useRef } from "react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export default function SlideOver({ open, onClose, title, children, width = "max-w-md" }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && panelRef.current) {
      const firstInput = panelRef.current.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input, textarea, select"
      );
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 150);
      }
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative ${width} w-full bg-white shadow-xl flex flex-col
          animate-[slideIn_0.2s_ease-out]`}
        style={{ animationFillMode: "forwards" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-wsp-border">
          <h3 className="font-display font-semibold text-wsp-dark text-sm tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="text-wsp-muted hover:text-wsp-dark text-lg leading-none"
          >
            &times;
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
