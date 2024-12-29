# vite-plugin-vue-convention-routes

一个 vue 的约定式路由插件

## Core 核心

`src/convention-route.ts`

## Usage 使用

```js
import vitePluginAutoRoutes from 'vite-plugin-vue-convention-routes'

export default defineConfig({
  plugins: [vue(), vitePluginAutoRoutes({})]
})
```

## Options 选项

|  选项   |         类型         |    默认值     |   描述   |
| :-----: | :------------------: | :-----------: | :------: |
| pageDir |       `string`       | `'src/pages'` | 路由目录 |
| history | `'history' / 'hash'` |   `history`   | 路由前缀 |
