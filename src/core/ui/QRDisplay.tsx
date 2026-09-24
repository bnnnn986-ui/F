import { useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';

export function QRDisplay({ url, size = 180 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: size, color: { dark: '#1a1c2c', light: '#ffffff' } })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  return (
    <div className="pixel-qr" style={{ width: size + 16, height: size + 16 }}>
      {dataUrl ? (
        <img src={dataUrl} width={size} height={size} alt={`QR code สำหรับเข้าร่วมห้อง: ${url}`} />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
    </div>
  );
}
