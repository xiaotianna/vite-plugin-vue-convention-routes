import path from 'node:path'
import fs from 'node:fs'
import { type Plugin, type ResolvedConfig } from 'vite'
import * as babelParser from '@babel/parser'
import _traverse from '@babel/traverse'
// @ts-ignore
const traverse = _traverse.default
import _generate from '@babel/generator'
// @ts-ignore
const generate = _generate.default
import * as t from '@babel/types'

const virtualModuleId = 'virtual:convention-import-routes'
const resolvedVirtualModuleId = '\0' + virtualModuleId

let options = {} as Options
let defaultOptions = {
  pageDir: 'src/pages', // 页面所在的目录
  history: 'history' // 路由模式
}
let viteConfig = {} as ResolvedConfig
type Options = Partial<typeof defaultOptions>
let routesFileContent: string

export default (opts: Options = defaultOptions): Plugin => ({
  name: 'vite-plugin-vue-convention-routes',
  // 读取vite的配置
  configResolved(config) {
    // 缓存vite配置
    viteConfig = config
    // 合并插件配置
    options = { ...defaultOptions, ...opts }
    // 生成路由
    initRoutes()
  },
  resolveId(id) {
    if (id === virtualModuleId) {
      return resolvedVirtualModuleId
    }
  },
  load(id) {
    if (id === resolvedVirtualModuleId) {
      return routesFileContent
    }
  },
  transform(code, id, options) {
    if (id.includes(viteConfig.root + '/src/main.ts')) {
      // 1. 使用 @babel/parser 解析代码生成 AST
      const ast = babelParser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript']
      })
      // 插入 import router from 'virtual:convention-import-routes'
      traverse(ast, {
        Program(path: any) {
          const importDeclaration = t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier('router'))],
            t.stringLiteral(virtualModuleId)
          )
          path.node.body.unshift(importDeclaration)
          path.stop()
        }
      })
      // 找到 createApp 的调用并添加 .use(router)
      traverse(ast, {
        CallExpression(path: any) {
          if (
            path.node.callee.name === 'createApp' &&
            path.node.arguments[0].name === 'App'
          ) {
            // 创建 .use(router) 的调用
            const useRouterCall = t.callExpression(
              t.memberExpression(path.node, t.identifier('use')),
              [t.identifier('router')]
            )
            // 替换原来的 createApp(App) 调用
            path.replaceWith(useRouterCall)
            path.stop()
          }
        }
      })
      const output = generate(ast).code
      return output
    }
  }
})

// 生成路由
const initRoutes = () => {
  const { pageDir } = options
  if (!pageDir) return
  // 生成page页面绝对路径
  const pageDirFullPath = path.resolve(viteConfig.root, pageDir!)
  // 生成路由文件绝对路径
  const routes = createRoutes(pageDirFullPath!)
  removeLeadingSlash(routes)
  let str = JSON.stringify(routes, null, 2)
  // 替换 component 字段的字符串形式为函数调用
  str = str.replace(
    /"component": "(\(\) => import\((.*?)\))"/g,
    '"component": $1'
  )
  // 写入路由文件
  const content = `import { createRouter, ${options.history === 'history' ? 'createWebHistory' : 'createWebHashHistory'} } from 'vue-router'

const router = createRouter({
  history: ${options.history === 'history' ? 'createWebHistory' : 'createWebHashHistory'}(),
  routes: ${str}
})

export default router\n`
  routesFileContent = content
}

// 生成路由表
const createRoutes = (
  pageDirFullPath: string
): {
  path: string
  component: string
  children: any[]
  meta?: any
}[] => {
  const filenames = fs.readdirSync(pageDirFullPath)
  const routes: {
    path: string
    component: string
    children: any[]
    meta?: any
  }[] = []

  filenames.forEach((filename) => {
    const filePath = path.join(pageDirFullPath, filename)

    if (fs.statSync(filePath).isDirectory()) {
      const routerName = transformRouteName(filename)
      const childRoutes = createRoutes(filePath)
      const route: {
        path: string
        component: string
        children: any[]
        meta?: any
      } = {
        path: routerName === 'index' ? '' : '/' + routerName,
        component: '', // 这里将会在后面赋值
        children: childRoutes
      }

      // 如果文件夹中有 index.vue，设置父路由的 component
      const indexFilePath = path.join(filePath, 'index.vue')
      if (fs.existsSync(indexFilePath)) {
        route.component = `() => import('${indexFilePath}')`
      }

      // 检查是否存在 meta 文件
      const metaFilePath = path.join(pageDirFullPath, `${routerName}.meta.json`)
      if (fs.existsSync(metaFilePath)) {
        route.meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf-8'))
      }

      // 移除 path 为空且 component 相同的子路由
      route.children = route.children.filter(
        (child) => !(child.path === '' && child.component === route.component)
      )

      routes.push(route)
    } else if (filename.endsWith('.vue')) {
      const routerName = transformRouteName(filename.replace('.vue', ''))
      const routePath = routerName === 'index' ? '' : '/' + routerName
      const route: {
        path: string
        component: string
        children: any[]
        meta?: any
      } = {
        path: routePath,
        component: `() => import('${filePath}')`,
        children: []
      }

      // 检查是否存在 meta 文件
      const metaFilePath = path.join(pageDirFullPath, `${routerName}.meta.json`)
      if (fs.existsSync(metaFilePath)) {
        route.meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf-8'))
      }

      // 处理动态路由
      if (routerName.includes('[') && routerName.includes(']')) {
        const dynamicParam = routerName.replace(/\[(.*?)\]/g, '/:$1')
        route.path = `/${dynamicParam}`
      }

      routes.push(route)
    }
  })

  return routes
}

// 转换路由名称
const transformRouteName = (str: string): string => {
  // 将大写字母转换为小写，并在大写字母前添加连字符
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // 在小写字母后跟大写字母的地方插入连字符
    .toLowerCase() // 将整个字符串转换为小写
}

// 移除二级路径中的斜杠
function removeLeadingSlash(routes: any[], isFirstLevel = true) {
  routes.forEach((route) => {
    // 如果不是第一级路由，去掉路径前的斜杠
    if (!isFirstLevel && route.path.startsWith('/')) {
      route.path = route.path.substring(1)
    }
    // 如果有子路由，递归调用，标记为非第一级
    if (route.children && route.children.length > 0) {
      removeLeadingSlash(route.children, false)
    }
  })
}
