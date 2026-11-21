import { useEffect, useRef, useState } from "react";
import { IconX } from "./icons.js";

// Full-screen photo preview: Esc / backdrop click closes, image click toggles zoom.
export default function Lightbox({ src, alt, onClose }) {
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      data-testid="lightbox"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Photo band karo"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <IconX className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt || "Bheji gayi photo"}
        onClick={(event) => {
          event.stopPropagation();
          setZoomed((current) => !current);
        }}
        className={`max-h-[85vh] max-w-[92vw] rounded-lg shadow-2xl transition-transform duration-150 ${
          zoomed ? "cursor-zoom-out scale-150" : "cursor-zoom-in"
        }`}
      />
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">
        {zoomed ? "Chhota karne ke liye click karo" : "Zoom karne ke liye click karo"}
      </p>
    </div>
  );
}
