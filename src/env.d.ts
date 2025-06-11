/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly EMAIL_USER: string;
  readonly EMAIL_PASS: string;
  readonly EMAIL_DESTINATION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}