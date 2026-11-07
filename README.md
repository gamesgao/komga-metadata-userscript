# Komga Metadata Userscript

桌面浏览器中的 Komga 多源元数据工具。目标是不运行额外后端，在线获取来源资料，或按页读取用户选取的预建 SQLite 目录，然后预览并写回 Komga。

**组件 1 已实现，项目仍开发中，尚未发布稳定版本。** 当前包含 TypeScript 多源搜索/详情、GM 传输、Shadow DOM 中文面板、锁感知预览、Komga 写入读回与保守撤销。离线 SQLite、BookWalker 和四类目录构建器属于组件 2，当前没有伪造入口或下载地址。验收边界见 [VALIDATION.md](VALIDATION.md)，设计见 [DESIGN.md](DESIGN.md)。

## 构建与安装

```sh
npm ci
npm test
npm run typecheck
npm run build
```

将 `dist/komga-metadata.user.js` 安装到桌面 Tampermonkey/兼容管理器。运行时无额外后端、框架或远程执行代码；跨域来源使用 GM API，Komga 使用同源当前会话。文件顶部的 HTTP(S) 广泛匹配**只在页面标题/应用名、应用容器及同源资源/API 标识共同符合 Komga 时**创建按钮/菜单，检测前不访问存储或发送请求。非 Komga 页只作有限时长的 DOM 检测，不修改页面。

建议在管理器中将 `@match` 缩小为自己的部署地址，例如 `https://your-komga.example/reader/*`（自行替换，不把私有配置放进仓库）。来源封面可位于不同 CDN，因此 `@connect *` 允许 GM 访问来源链接；所有下载均为用户主动选择，默认不携带浏览器跨站 Cookie。检测策略偏保守；无 Komga 标识的定制 WebUI 不会被自动激活。

打开系列或 One-shot 详情页，点击右下角“元数据”，或使用管理器菜单“元数据：当前系列”。支持根路径、上下文路径、旧 hash 路由和 `/series/`、`/oneshot/`。无需修改 WebUI 全局函数。页面切换后关闭并重新启动面板。

## 使用与安全边界

选择来源搜索，点击**某一候选**或输入所选来源链接/API ID，再生成预览。默认不改标题；数组合并保留已有标签、链接、别名。预览可以逐字段取消，也可编辑 JSON 新值。作者只写书籍；系列与书籍锁均保留。具体卷/期必须选择服务器书籍 ID，或通过代码接口验证唯一 `metadata.number`，绝不使用数组下标配卷。One-shot 读取实际唯一关联书籍并将封面写到该书籍。

应用前重新读取字段/锁/封面；每次 PATCH、封面上传和选择均读回验证。封面限定图片 MIME/签名及可用时的真实解码，内容按 SHA-256 比较，不按文件大小猜测。失败保留具体错误，元数据成功而封面失败仍为“部分完成”。未知状态不写入，EH 上传日期不作为发行日，命名空间标签原样保留，日文标题/作者不强制转写或简繁转换。

“撤销最近写入”的原始字段和封面选择快照存放 GM 本地；只恢复本次改动，拒绝覆盖后来修改或新锁定的字段。仅删除本次上传且得到新 ID 回执的封面，不批量清理用户封面。上传回执丢失或错误时无法安全确认所有权，会留下明确错误，不猜测删除。服务器 API 没有原子 compare-and-swap，最后一次读与写之间仍有短暂并发窗口；不是事务式多目标更新。后端若转换上传图片字节，本组件会保守报读回不符而非误报成功。

MAL Client ID、ComicVine API Key、ExH 登录 Cookie 由用户在“设置”自行填写，默认空，缺少时明确报需认证。凭据仅存在 GM 存储，不写日志、不提供导出；密码输入框不代表加密存储。ExH 必须明确启用；管理器能否正确发送指定 Cookie 尚需实际登录验收。

## 来源能力

| 来源 | 已实现在线能力 | 限制 |
|---|---|---|
| Bangumi | next API 搜索、详情、分页 staff/relations、单卷详情 | 未知状态不推断；关联简表需另读详情 |
| MangaUpdates | API 搜索、详情；现代七位 base36 链接及旧链接重定向 | API 数字 ID 与旧数字 ID 不混用；仅系列 |
| MangaBaka | 新旧标题字段、tags_v2、links_v2、原图及分页卷封面 | 系列元数据+卷封面，无独立卷详情 |
| MangaDex | UUID 搜索/详情、author/artist、分页卷封面 | 系列元数据+卷封面，无独立卷详情 |
| AniList | GraphQL 搜索/详情、native/full 人名 | 系列；人物前 50 条，超出会提示不完整 |
| EH / ExH | HTML 搜索、gid/token、gdata namespaced tags | 单画廊；搜索首屏最多 25 条、缩略图封面，不推断卷号/发行日/系列状态 |
| MAL | 官方 API 搜索/详情 | 自备 Client ID，系列；未做凭据 live 验收 |
| ComicVine | 卷搜索、卷/期详情、实际 issue ID、期作者/日期 | 自备 API Key；未做凭据 live 验收 |
| VIZ | HTML 搜索、现代 `/product/ID` 链接、单卷字段 | 单卷；不抓完整系列目录 |
| YenPress | 动态公开搜索配置、系列/单卷 HTML、分页卷列表 | 系列简介/封面为精选卷，界面明确提示 |
| Webtoons | Originals/Canvas 搜索与 HTML 系列详情 | 系列；不将章当成卷 |

来源结构变化、拦截、错误 ID、认证失败和分页超限均显式报错，不伪造空成功。所有上游数据/图片的版权和使用条款独立于本代码 MIT 授权，见 [THIRD_PARTY.md](THIRD_PARTY.md)。

## 验证与下一组件

```sh
# 仅安装独立测试浏览器到忽略目录（macOS/Linux）
PLAYWRIGHT_BROWSERS_PATH=.runtime/playwright npx playwright install chromium --only-shell
npm run test:browser

# 可选公开来源诊断；不访问 Komga，不读取任何凭据/私有配置
npm run test:live
```

浏览器测试加载**实际 dist 产物**，使用回环 HTTP fixture 与 GM shim；不是实际管理器或真实 Komga 验收。公开探测的 Node fetch 也不代表 GM 管理器网络实测。`.runtime/`、`test-results/` 等原始本地证据不进入 git。组件 2 可实现 `Provider` 并调用 `Registry.register`，通过 `CatalogExtension` 接入独立数据库面板；`workerAssetBase` 由 `KOMGA_METADATA_ASSET_BASE=https://static.example/assets/ npm run build` 设置，仅允许静态 HTTP(S) 目录。无需增加运行时服务。
