/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RETROSNAP_API_BASE_URL?: string;
  readonly VITE_RETROSNAP_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
