import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuration Vitest (tests unitaires de la couche données).
 *
 * ⚠️ Le package `server-only` lève une erreur en dehors de la condition
 * "react-server" de Next.js — on l'alias vers un stub vide pour que les
 * tests puissent importer `lib/data/*` en environnement Node.
 */
export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    clearMocks: true,
  },
});
