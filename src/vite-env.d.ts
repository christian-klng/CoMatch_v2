/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the CoMatch API, baked in at build time (Coolify build-arg). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
