# GitHub 发布步骤 · 1.0

公开仓库：[jindx1020-crypto/qingzhu-sword-array](https://github.com/jindx1020-crypto/qingzhu-sword-array)。1.0 标签为 `v1.0`，[Release 入口](https://github.com/jindx1020-crypto/qingzhu-sword-array/releases/tag/v1.0)，标题为 **1.0正式发布**。

本页保留构建、验证和上传步骤供后续维护。

## 发布前核对

- 阅读 [验收报告](release-1.0.md)，保留尚未验证的真机与原著细节说明。
- 核对 [素材来源](assets.md)：原始人物／飞剑参考图的再分发权利需要作者确认；GPL 代码许可不代替素材或小说 IP 授权。
- 从源码包在干净目录执行 [开发文档](development.md) 中的检查与构建。
- 发布对应源码与两份 HTML，保留 GPLv3、第三方声明和制作署名。

## 仓库与提交

当前项目使用公开仓库 `https://github.com/jindx1020-crypto/qingzhu-sword-array`，主分支 `main`。源码按 GPL-3.0-only 发布，图片及小说 IP 范围另行声明。

提交前检查 `git status`，只提交公开白名单中的源码、必要素材、测试和文档。`local-archive/`、`release/`、依赖缓存及个人存档不进入 Git。仓库维护已有 README、LICENSE 和忽略规则，不重复初始化。

## 创建 Release

检查 GitHub Actions 完成后，为同一提交创建 `v1.0` 标签与正式 Release。标题和正文均可用 **1.0正式发布**。

从项目 `release/1.0/` 上传同一次构建的附件：

- 青竹剑阵_1.0_免安装版.zip（玩家优先下载，解压后双击「开始游戏.html」）

- 凡人修仙传_青竹剑阵.html
- 凡人修仙传_青竹剑阵_兼容PNG.html
- 青竹剑阵_源码.zip
- SHA256SUMS.txt
- release-manifest.json

源码附件必须与两份 HTML 对应，不用过期 beta 源码替代。`release-manifest.json` 记录公开源文件哈希，SHA256SUMS.txt 校验玩家包、两份 HTML 与源码包。

先进入 `release/1.0/`，再在 macOS／Linux 使用 `shasum -a 256 -c SHA256SUMS.txt` 校验。Windows PowerShell 可用 `Get-FileHash -Algorithm SHA256`，逐项比较。

HTML／ZIP 不提交进源码历史，放在 Release 附件。仓库只保留必需源码、素材、测试和当前文档。GitHub 自动生成的 Source code ZIP 也保留，但玩家优先下载免安装玩家包，也可单独下载直接运行的 HTML。

## 后续维护

上传后检查 Release 附件可下载、校验值一致，下载 HTML 可离线运行；确认源码安装构建成功。仓库地址与源码获取说明已经写入 README 和游戏内许可页；地址或文档变更后重建成品。需要在线托管时另行安排部署，本次流程只发布仓库与离线文件。
