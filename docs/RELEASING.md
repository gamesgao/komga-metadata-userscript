# 自动发布与更新

## 用户安装

- [安装最新版](https://github.com/gamesgao/komga-metadata-userscript/releases/latest/download/komga-metadata.user.js)
- [更新元数据](https://github.com/gamesgao/komga-metadata-userscript/releases/latest/download/komga-metadata.meta.js)
- [全部版本](https://github.com/gamesgao/komga-metadata-userscript/releases)

本机 Chromium 实测：从文件导入 Release 附件成功；直接导航到附件链接未自动出现 Tampermonkey 安装确认。若浏览器将该附件下载为文件，使用 **Tampermonkey 管理面板 → 实用工具 → 从文件导入** 安装 `.user.js`。若你的浏览器能直接弹出确认页，也可直接安装。

安装后由 Tampermonkey 按其设置检查更新。`@updateURL` 只下载 metadata 文件，发现新版本后通过 `@downloadURL` 获取脚本。旧的 main/raw 安装用户可以安装一次 Release 版切换到该通道；脚本 name/namespace 不变，GM 设置键不变。

参考的 [KomgaBangumi](https://github.com/dyphire/KomgaBangumi) 使用 `.user.js` + `.meta.js` 分发。查阅时其仓库没有 Actions Release 工作流，本项目是在沿用更新约定的基础上补充自动发布。

## 发布触发

1. 修改代码，运行 `npm version patch --no-git-tag-version`（也可 minor/major）。`package.json` 是脚本版本的唯一来源，不再手改脚本头。
2. `npm run build` 生成开发产物与 `.meta.js`，提交源码、package/lock 和 dist，推送到 `main`。
3. `Verify userscript` 完整通过后，`Release userscript` 自动启动。
4. 只接受本仓库 **main push** 的成功验证事件，checkout 那次验证的确切 SHA，而不是发布时可能已经前进的 main。
5. 该版本已经公开发布则跳过，不覆盖 tag/附件。未发布则构建 Release 版，再跑打包脚本的浏览器回归和发布检查。
6. 创建草稿、上传附件、重新下载并逐文件 SHA-256 核验；全部通过后才公开 Release。版本 tag 指向被验证的源提交。

无需个人 PAT。只使用仓库 `GITHUB_TOKEN`，普通验证只读，发布 job 才有 `contents: write`。PR、fork 和失败 CI 不进入发布。流水线不向 main 自动回写版本，不递归触发发布。

失败后可在 GitHub Actions 重跑对应 `Release userscript`；匹配同一提交的草稿可恢复。若 tag/草稿属于其他提交则停止，不移动 tag。公开版本不变，修复需升版本。重跑原 main push 的验证任务也会再次触发发布检查；普通 `workflow_dispatch` 验证不发布。

## 产物

- `komga-metadata.user.js`：安装脚本。
- `komga-metadata.meta.js`：与脚本头完全一致的轻量更新文件。
- `komga-metadata-vX.Y.Z.zip`：脚本、metadata、`catalog/` Worker/WASM、许可证及说明。
- `release-manifest.json`：版本、源码提交、静态文件大小与 SHA-256。
- `SHA256SUMS`：各下载附件的 SHA-256。

**没有预建数据库、来源归档、测试书籍、凭据或 `.runtime` 数据。** WASM 是 SQLite 引擎程序，不是数据库内容。

## 开发构建与 Release 构建

```sh
npm ci
npm --prefix catalog ci
npm run build                       # 开发产物；资源跟随 main
npm run test:release
KOMGA_METADATA_RELEASE=1 npm run build
KOMGA_METADATA_RELEASE=1 npm run test:release
npm run package:release             # 输出 .runtime/release-artifacts/vX.Y.Z/
```

Release 脚本的 Worker/WASM URL 固定到该版本 tag 下的 `dist/catalog/`，不会随 main 漂移。ZIP 也保留这套目录结构，支持已有的 `KOMGA_METADATA_ASSET_BASE` 自托管构建。生产打包器拒绝未固定资源版本的开发产物。

本地验证发布附件后，可用 `KOMGA_ACCEPTANCE_ARTIFACT=.runtime/.../komga-metadata.user.js` 指定 `acceptance/e2e.py`、`real_flows.py`、`ui_capture.py` 的输入。仍仅对隔离 loopback Komga 操作。

当前自动发布只接受规范的 `X.Y.Z` 版本。0.x Release 仍是开发中的版本，不代表所有外部来源、凭据模式或浏览器均已验收。发布门禁覆盖自动化测试的实际范围，不伪造外部 live 结果。
