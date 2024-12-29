/** @type {import('rollup').RollupOptions} */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'lib',
      format: 'cjs',
      entryFileNames: '[name].cjs.js',
      sourcemap: false
    },
    {
      dir: 'lib',
      format: 'esm',
      entryFileNames: '[name].esm.js',
      sourcemap: false
    },
    {
      dir: 'lib',
      format: 'umd',
      entryFileNames: '[name].umd.js',
      name: 'VITE__ROUTES', // umd模块名称，相当于一个命名空间，会自动挂载到window下面
      sourcemap: false,
      plugins: [terser()],
      globals: {
        'node:path': 'path', // 指定 node:path 的全局变量名
        'node:fs': 'fs', // 指定 node:fs 的全局变量名
        tty: 'tty', // 指定 tty 的全局变量名
        util: 'util' // 指定 util 的全局变量名
      }
    }
  ],
  plugins: [
    resolve(),
    commonjs({
      include: /node_modules/
    }),
    typescript({ module: 'ESNext' }),
    json()
  ],
  external: [
    'node:path',
    'node:fs',
    'tty',
    'util',
    '@babel/generator',
    '@babel/parser',
    '@babel/traverse',
    '@babel/types'
  ] // 声明外部模块
}
