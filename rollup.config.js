import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"

const banner = `/*!
 * DataGrid v1.0.0
 * A modular, high-performance inline editing table library
 * (c) ${new Date().getFullYear()}
 * Released under the MIT License
 */`

export default [
  // ESM build (for modern bundlers and <script type="module">)
  {
    input: "src/index.js",
    output: {
      file: "dist/datagrid.esm.js",
      format: "esm",
      banner,
      sourcemap: true,
    },
    plugins: [nodeResolve()],
  },

  // ESM minified
  {
    input: "src/index.js",
    output: {
      file: "dist/datagrid.esm.min.js",
      format: "esm",
      banner,
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      terser({
        format: {
          comments: /^!/,
        },
      }),
    ],
  },

  // UMD build (for <script> tags and CommonJS)
  {
    input: "src/index.js",
    output: {
      file: "dist/datagrid.umd.js",
      format: "umd",
      name: "DataGrid", // window.DataGrid
      banner,
      sourcemap: true,
      exports: "named",
    },
    plugins: [nodeResolve()],
  },

  // UMD minified (for production <script> tags)
  {
    input: "src/index.js",
    output: {
      file: "dist/datagrid.umd.min.js",
      format: "umd",
      name: "DataGrid",
      banner,
      sourcemap: true,
      exports: "named",
    },
    plugins: [
      nodeResolve(),
      terser({
        format: {
          comments: /^!/,
        },
      }),
    ],
  },
]
