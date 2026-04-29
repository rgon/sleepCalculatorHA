import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";

const dev = process.env.ROLLUP_WATCH;

export default {
  input: "src/sleep-calculator-card.ts",
  output: {
    file: "sleep-calculator-card.js",
    format: "es",
    inlineDynamicImports: true,
    sourcemap: dev ? true : false,
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    json(),
    typescript(),
    !dev && terser(),
    dev &&
      serve({
        open: true,
        openPage: "/demo.html",
        host: "localhost",
        port: 8080,
        contentBase: ".",
      }),
    dev && livereload({ watch: "sleep-calculator-card.js", port: 35729 }),
  ].filter(Boolean),
  onwarn(warning, warn) {
    // Suppress circular dependency warnings from lit
    if (warning.code === "CIRCULAR_DEPENDENCY") return;
    warn(warning);
  },
};
