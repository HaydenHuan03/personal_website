import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Maximize2, X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * An image that opens full-size in a native <dialog> when clicked.
 * showModal() provides focus trapping, Escape-to-close, and a backdrop for free.
 */
export default function ImageLightbox({ src, alt, className }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    dialogRef.current?.showModal();
    setOpen(true);
  };
  const close = () => dialogRef.current?.close();

  // Clicks on the ::backdrop are dispatched to the dialog element itself.
  const onDialogClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) close();
  };

  // Native modal dialogs do not lock page scroll behind them.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={`View full size: ${alt}`}
        className="group relative block w-full cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
      >
        <img src={src} alt={alt} loading="lazy" className={className} />
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-stone-700 opacity-70 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 size={12} aria-hidden="true" />
          Click to enlarge
        </span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={onDialogClick}
        aria-label={alt}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-stone-950/85 backdrop:backdrop-blur-sm open:animate-[fadeInUp_0.25s_ease-out]"
      >
        {open && (
          <img
            src={src}
            alt={alt}
            className="block max-h-[90vh] max-w-[95vw] rounded-lg bg-white object-contain shadow-2xl"
          />
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="fixed right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </dialog>
    </>
  );
}
