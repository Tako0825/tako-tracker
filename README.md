# tako-tracker

`tako-tracker` 是一个面向前端项目的一期埋点与监控 SDK 原型，当前版本已经在本仓库的 Vue 2 项目中完成最小闭环验证。

当前已跑通的能力：

- 页面曝光 `page_view`
- 性能数据 `performance`
- JS 报错 `js_error`
- 请求报错 `api_error`
- 慢请求 `api_slow`
- 后端批量接收与 MySQL 落库

当前定位：

- 一期最小可运行 SDK
- 优先验证核心能力与工程结构
- 暂未做 npm 发布、离线缓存、远程配置、点击曝光、Breadcrumbs 等二期能力

---

## 一期能力

当前版本已具备以下能力：

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| `createTracker()` | 已完成 | 创建 Tracker 实例 |
| `track()` | 已完成 | 手动上报自定义事件 |
| `trackPageView()` | 已完成 | 页面访问事件 |
| `trackError()` | 已完成 | 手动错误上报 |
| 全局错误采集 | 已完成 | `window error`、`unhandledrejection` |
| Vue 错误采集 | 已完成 | `Vue.config.errorHandler` |
| 请求监控 | 已完成 | `startRequest / endRequest / createRequestAdapter` |
| 性能采集 | 已完成 | `FP / FCP / TTFB / DOMReady / Load` |
| 批量上报 | 已完成 | 批量发送到后端接口 |
| 页面卸载兜底 | 已完成 | `sendBeacon` |

---

## 目录结构

```text
tako-tracker/
├── package.json
├── README.md
└── src/
    ├── index.js
    ├── constants/
    │   ├── events.js
    │   └── options.js
    ├── core/
    │   └── Tracker.js
    ├── collectors/
    │   ├── error.js
    │   ├── performance.js
    │   └── request.js
    └── utils/
        ├── browser.js
        └── event.js
```

目录职责：

- `src/index.js`
  - SDK 对外统一出口
- `src/constants`
  - 事件类型、优先级、默认配置等常量
- `src/core`
  - `Tracker` 主类与核心编排逻辑
- `src/collectors`
  - 错误、性能、请求等采集器
- `src/utils`
  - 浏览器环境判断、事件辅助函数

---

## 对外 API

当前入口文件是 [index.js](file:///c:/Users/Administrator/Desktop/car-sales/tako-tracker/src/index.js)。

### 创建实例

```js
import { createTracker } from "@tako/tracker";

const tracker = createTracker({
  endpoint: "http://localhost:3000/api/track/batch",
  appId: "car-sales-admin",
  appName: "Car Sales Admin",
  release: "0.1.0",
  env: "dev",
});
```

### 当前支持的实例方法

- `init()`
- `destroy()`
- `track()`
- `trackPageView()`
- `trackError()`
- `startRequest()`
- `endRequest()`
- `createRequestAdapter()`
- `attachVueRouter()`
- `flush()`

---

## 事件常量

当前已统一抽出事件常量，位于 [events.js](file:///c:/Users/Administrator/Desktop/car-sales/tako-tracker/src/constants/events.js)。

示例：

```js
import {
  EVENT_CATEGORY,
  EVENT_TYPE,
  EVENT_LEVEL,
  ERROR_KIND,
} from "@tako/tracker";
```

当前内置：

- `EVENT_CATEGORY.TRACK`
- `EVENT_CATEGORY.MONITOR`
- `EVENT_TYPE.PAGE_VIEW`
- `EVENT_TYPE.JS_ERROR`
- `EVENT_TYPE.RESOURCE_ERROR`
- `EVENT_TYPE.API_ERROR`
- `EVENT_TYPE.API_SLOW`
- `EVENT_TYPE.PERFORMANCE`
- `EVENT_TYPE.CUSTOM`
- `EVENT_LEVEL.P0`
- `EVENT_LEVEL.P1`
- `EVENT_LEVEL.P2`
- `ERROR_KIND.JS`
- `ERROR_KIND.PROMISE`
- `ERROR_KIND.VUE`
- `ERROR_KIND.MANUAL`

---

## 当前接入方式

本仓库当前还不是 npm 正式发布模式，但 Vue 项目已经切到“本地包依赖接入”。

Vue 项目在 [package.json](file:///c:/Users/Administrator/Desktop/car-sales/vue/package.json) 中通过以下方式声明 SDK 依赖：

```json
"@tako/tracker": "file:../tako-tracker"
```

这样业务代码里引用 SDK 时，就可以直接使用：

```js
import { createTracker, ERROR_KIND } from "@tako/tracker";
```

当前接入方式适合：

- 一期快速验证
- 本地联调
- 在同仓库中同步重构 SDK 和业务项目
- 保持未来切换到真正 npm 发布包时的调用方式一致

后续如果要真正发布 npm 包，再补打包、产物目录和版本发布流程。

---

## Vue 2 接入说明

### 1. 创建 Vue 适配入口

当前项目的 Vue 适配层在：

- [adapter-vue/index.js](file:///c:/Users/Administrator/Desktop/car-sales/vue/src/tracker/adapter-vue/index.js)

它的职责：

- 创建 tracker 单例
- 安装 Vue 错误捕获
- 绑定 `vue-router`
- 暴露 `Vue.prototype.$tracker`

其中 SDK 能力统一从包名导入：

```js
import { createTracker } from "@tako/tracker";
```

### 2. 在 `main.js` 中初始化

当前接入位置：

- [main.js](file:///c:/Users/Administrator/Desktop/car-sales/vue/src/main.js)

调用方式：

```js
import { setupTracker } from "./tracker";

setupTracker({ router, store });
```

### 3. 绑定路由页面访问

Vue adapter 内部会调用：

```js
tracker.attachVueRouter(router);
```

这样会自动采集：

- 首次进入页面
- 路由切换页面访问

### 4. 接入 Vue 错误处理

Vue 适配层已经在：

- [error-handler.js](file:///c:/Users/Administrator/Desktop/car-sales/vue/src/tracker/adapter-vue/error-handler.js)

中接入：

```js
Vue.config.errorHandler
```

这样组件运行时错误会由 SDK 自动捕获并上报，不需要业务代码手动调用 `trackError()`。
错误类型常量也通过包名直接导入：

```js
import { ERROR_KIND } from "@tako/tracker";
```

---

## 请求监控接入说明

当前请求封装文件：

- [api/index.js](file:///c:/Users/Administrator/Desktop/car-sales/vue/src/api/index.js)

当前接入方式是：

1. 请求前调用 `tracker.startRequest()`
2. 请求完成后调用 `tracker.endRequest()`
3. 失败请求自动上报 `api_error`
4. 超过阈值的请求自动上报 `api_slow`

示例：

```js
const span = tracker.startRequest({
  url: requestUrl,
  method: options.method || "GET",
});

try {
  const response = await fetch(requestUrl, options);
  tracker.endRequest(span, {
    status: response.status,
    ok: response.ok,
  });
} catch (error) {
  tracker.endRequest(span, {
    status: 0,
    ok: false,
    error,
  });
}
```

如果你后续想在 React 或原生 JS 中复用，也可以直接使用：

```js
const trackedFetch = tracker.createRequestAdapter(fetch);
```

---

## 后端接口约定

当前后端接口地址：

```text
POST /api/track/batch
```

本仓库当前联调地址：

```text
http://localhost:3000/api/track/batch
```

请求体格式：

```json
{
  "meta": {
    "sentAt": 1700000000000,
    "sdkVersion": "0.1.0"
  },
  "events": [
    {
      "id": "evt_xxx",
      "category": "track",
      "type": "page_view",
      "level": "P2",
      "ts": 1700000000000,
      "ctx": {
        "appId": "car-sales-admin",
        "appName": "Car Sales Admin",
        "release": "0.1.0",
        "env": "dev",
        "uid": "1",
        "sid": "sid_xxx",
        "url": "http://localhost:8080/product",
        "route": "/product",
        "ua": "Mozilla/5.0",
        "deviceType": "desktop"
      },
      "payload": {}
    }
  ]
}
```

---

## 联调验证

当前项目里已经有一个专门的测试页面：

- [TrackerTestArea.vue](file:///c:/Users/Administrator/Desktop/car-sales/vue/src/layouts/home/TrackerTestArea.vue)

菜单入口：

- `埋点测试`

当前可以验证：

- 请求报错上报
- Vue 运行时错误自动上报

此外，实际联调中还已经验证通过：

- 页面访问 `page_view`
- 性能数据 `performance`
- 请求报错 `api_error`
- JS 报错 `js_error`

数据库落库表：

- `track_event`

---

## 当前限制

一期当前仍有以下限制：

- 仅完成 Vue 项目接入验证
- 当前为本地 `file:` 依赖，尚未整理为正式 npm 发布包
- 尚未支持 React 适配层
- 尚未支持原生 JS 适配层
- 尚未实现点击埋点
- 尚未实现曝光埋点
- 尚未实现 Breadcrumbs
- 尚未实现离线缓存与重试
- 尚未实现远程配置

---

## 一期完成标准

当前可以把一期完成标准定义为：

1. SDK 核心目录结构清晰
2. Vue 适配层可正常接入
3. `page_view / performance / js_error / api_error` 可正常上报
4. 后端接口可正常接收并落库
5. 有测试页面可完成联调验证

按这个标准，当前 `tako-tracker` 已基本达到一期可交付状态。

---

## 后续建议

二期建议按以下顺序推进：

1. React / 原生 JS 适配层
2. 点击埋点
3. 组件曝光
4. Breadcrumbs
5. 白屏与卡顿检测
6. 离线缓存与重试
7. 远程配置

---

## 当前版本

- 包名：`@tako/tracker`
- 仓库名：`tako-tracker`
- 当前版本：`0.1.0`
- 当前状态：一期最小可运行原型
