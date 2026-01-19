import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Custom rule overrides
  {
    rules: {
      // Downgrade to warnings - will be addressed incrementally
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow underscore-prefixed variables to be unused (common convention)
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // External/dynamic images can't use next/image optimization  
      "@next/next/no-img-element": "off",
      // React compiler memoization warnings are informational
      "react-compiler/react-compiler": "off",
      // setState in useEffect needs refactoring - downgrade to warning
      "react-hooks/set-state-in-effect": "warn",
      // GridStack integration requires mutable operations on grid instance
      "react-hooks/immutability": "warn",
      // Empty object type is sometimes intentional for extensible configs
      "@typescript-eslint/no-empty-object-type": "warn",
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Utility scripts
    "scripts/**",
  ]),
]);

export default eslintConfig;
