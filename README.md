# 碎银换今朝

无构建步骤的多页应用，导航和左右滑动顺序统一为 **首页 → 搬家 → 北京**。运行环境为 Node.js 22 或更新版本。

## 运行与检查

```sh
npm start
npm run check
npm test
```

本地地址：`http://127.0.0.1:3000/`、`/moving/`、`/beijing/`。Docker 部署继续使用 `/livenow/`、`/livenow/moving/`、`/livenow/beijing/`；省略末尾斜杠时自动跳转，旧的 `moving.html` 和 `beijing.html` 书签继续有效。

浏览器回归：安装开发依赖 `npm install` 后运行 `npm run test:browser`。Windows 默认使用已安装的 Edge，也可通过 `BROWSER_PATH` 指定浏览器；其他环境可先运行 `npx playwright install chromium`。覆盖导航顺序、双向滑动、History、直接进入章节、编辑与日期、旧记录、数据隔离、离线缓存及首页跨零点更新。

## 目录

```text
public/                         # 可对外提供的运行文件
  pages/
    home/                       # 首页：index.html、home.js、home.css、assets/
    moving/                     # 搬家：index.html、config.js、theme.css、assets/
    beijing/                    # 北京：index.html、config.js、theme.css、scenes.js、assets/
  shared/
    chapters.js                 # tab 顺序、名称、链接、导航色
    navigation.js               # 公共导航和当前页状态
    navigation.css
    tab-host.js                 # 常驻页面、滑动过渡、历史记录
    journal/                    # 公共事项、日期、排序、背景切换、同步及样式
    precache.js                 # 自动生成的离线资源清单
  sw.js                         # 离线缓存入口，保留根路径以兼容旧注册
server/index.cjs                # HTTP 路由、数据保存、可选访问密码
tests/                          # 服务端、交互逻辑和浏览器回归
scripts/                        # 语法检查、离线清单和搬家插画生成
design/home/                    # 猫咪封面源图、提示词及历史素材，不对外提供
docker/                         # Node 与 Nginx 镜像、Compose 配置
data/                           # 本地运行时数据，不提交；Docker 使用持久卷
```

每个 tab 的页面、配置、主题及图片放在自己的目录内。事项通用逻辑只依赖 `window.journalConfig`，北京与搬家的内容、存储键、同步地址和场景配置在各自的 `config.js` 中。首页的图片加载和日数计算独立位于 `pages/home/home.js`。

公共资源路径通过页面的应用根地址解析，因此切换 tab 后仍支持根路径和 `/livenow/` 部署前缀。服务端只提供 `public/` 中的静态文件，不暴露服务端代码、测试、设计源文件或数据目录。所有页面均通过规范访问地址进入。

## 页面与数据

- 首页：米白底、蓝灰猫与狸花白猫的扁平插画，标题为“碎银换今朝”。桌面与手机使用带内容指纹的透明 WebP，分别约 57 KB 和 30 KB。标题下显示日数和进度：以北京时间 2026年11月13日为第 9,765 天，按自然日递增，跨零点、重新打开及后台恢复时更新，进度条上限为 30,000 天。
- 搬家：2026年11月14日 - 2026年11月17日，左侧红花园事项、右侧紫樾润事项。雾蓝与冰青居家背景，搭配暖阳及斜照光束，无下雪效果。事项背景依次为打包、门口、新居和午后阳光。
- 北京：保留原封面、冬日背景和下雪效果，以及美食与景点事项。

两个事项页共用新增、编辑、详情、日期、完成标记、长按拖动排序及同步能力。页面在同源 iframe 中常驻，切换保留滚动、编辑和展开状态；输入、日期弹层及排序期间不会误触滑动切页。

| 页面 | 本地存储 / 同步状态 | API | 服务端文件 |
| --- | --- | --- | --- |
| 搬家 | `moving-journal-v1` / `moving-sync-v1` | `/api/moving-journal` | `moving-journal.json` |
| 北京 | `beijing-journal-v1` / `beijing-sync-v1` | `/api/journal` | `journal.json` |

接口支持 `/livenow` 前缀，旧章节路径下的 API 也继续可用。存储键、文件名及数据结构不变，已有数据无需迁移。设置 `DATA_DIR` 可指定数据目录，`HOST` 和 `PORT` 可指定监听地址，`APP_PASSWORD` 可启用原有密码校验。Docker 中继续将持久卷挂载到 `/app/data`。

## 修改页面与新增 tab

1. 在 `public/pages/<id>/` 放入页面、配置、主题和资源；复用 `public/shared` 的导航与事项模块。
2. 在 `public/shared/chapters.js` 中添加配置，数组顺序即导航及滑动顺序。
3. 在 `server/index.cjs` 注册规范页面路由；需要事项同步时使用独立存储键、API 和服务端文件。
4. 运行 `npm run cache` 更新离线资源清单，并递增 `public/sw.js` 的缓存版本。
5. 运行语法检查与回归测试。Docker 自动复制 `public/` 和 `server/`，无需逐个维护新增资源文件名。

修改搬家矢量插画后可运行 `npm run assets:moving`，生成桌面与手机插画：`cover*.svg` 为独立的打包启程封面，`room*.svg` 从该页配置生成首张房间背景。新增图片后运行 `npm run cache` 并更新 Service Worker 缓存版本。修改首页图片时使用新的内容指纹文件名，同时更新首页引用和离线清单；生成提示词见 `design/home/home-cats.prompt.md`。
