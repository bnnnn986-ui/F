import { useEffect, useState } from 'preact/hooks';

interface ToastItem {
  id: number;
  message: string;
  variant: 'info' | 'error' | 'success';
}

let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function publish() {
  listeners.forEach((fn) => fn(items));
}

export function showToast(message: string, variant: ToastItem['variant'] = 'info', durationMs = 3200): void {
  const item: ToastItem = { id: nextId++, message, variant };
  items = [...items, item];
  publish();
  setTimeout(() => {
    items = items.filter((i) => i.id !== item.id);
    publish();
  }, durationMs);
}

/** Renders the toast stack; mount once near the app root. */
export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div className="pixel-toast-stack" aria-live="polite">
      {list.map((item) => (
        <div
          key={item.id}
          className="pixel-toast pixel-panel"
          style={{
            borderColor: item.variant === 'error' ? 'var(--pp-danger)' : undefined,
          }}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
