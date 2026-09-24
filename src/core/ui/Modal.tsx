import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { PixelPanel } from './PixelPanel';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ComponentChildren;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pixel-modal-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="pixel-modal" onClick={(e) => e.stopPropagation()}>
        <PixelPanel>
          {title && <h2>{title}</h2>}
          {children}
        </PixelPanel>
      </div>
    </div>
  );
}
