import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".codex-remote-attachments/**",
    "cctc-welcome-intro/**",
    "output/**",
    "supabase/.branches/**",
    "supabase/.temp/**",
    "supabase/snippets/**",
    "tmp/**",
  ]),
]);

export default eslintConfig;
