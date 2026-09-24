/** Rolling d20 loading spinner — used for every "กำลังโหลด/เชื่อมต่อ…" state. */
export function D20Spinner({ size = 48, label }: { size?: number; label?: string }) {
  return (
    <div className="d20-spinner" role="status" aria-live="polite">
      <img src="assets/pixellab/items/d20.png" width={size} height={size} alt="" className="d20-spinner__die" />
      {label && <p className="d20-spinner__label">{label}</p>}
    </div>
  );
}
