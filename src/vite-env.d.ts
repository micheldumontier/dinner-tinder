/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the real DinnerMatch backend (e.g. http://localhost:8787).
   * When unset, the app falls back to the localStorage mock backend, which
   * only syncs across tabs of the same browser.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
