/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIGNAL_HOST?: string;
  readonly VITE_SIGNAL_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
