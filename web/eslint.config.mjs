// FE-3: real linting on top of `tsc`: Next.js core-web-vitals rules (includes React hooks and jsx-a11y basics).
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ["out/**", ".next/**", "node_modules/**", "public/**", "playwright-report/**", "test-results/**", ".lighthouseci/**", "next-env.d.ts"] },
  {
    rules: {
      // charts and maps deliberately read layout and theme tokens in effects
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off", // static export: plain <img>/<picture> with explicit sizes
    },
  },
];
export default config;
