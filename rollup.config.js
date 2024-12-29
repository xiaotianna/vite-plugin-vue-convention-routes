/** @type {import('rollup').RollupOptions} */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'

export default {
  input: 'lib/index.js',
  output: [
    {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].cjs.js',
      sourcemap: false
    },
    {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].esm.js',
      sourcemap: false
    },
    {
      dir: 'dist',
      format: 'umd',
      entryFileNames: '[name].umd.js',
      name: 'convention_routes', // umd模块名称，相当于一个命名空间，会自动挂载到window下面
      sourcemap: false,
      plugins: [terser()]
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    json()
  ]
}
