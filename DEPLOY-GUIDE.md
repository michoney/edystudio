# CNB 仓库 → 可访问网页部署 完整流程（给 Claude 的交接说明）

> 背景：用户有 CNB 仓库（https://cnb.cool/edyai.cc.cd/edystudio），希望它不只是"代码仓库"，
> 而是国内可访问的网页。以下是已经验证可行的完整方案。

## 一、关键事实（先纠正误解）

1. **CNB（cnb.cool）没有 Pages / 静态网站托管功能**。
   CNB = 代码仓库 + CI/CD（.cnb.yml 流水线）+ 制品仓库（Docker/npm 等），
   官方文档（docs.cnb.cool）里不存在任何"Pages"或"静态托管"能力。
   所以"部署成 CNB Pages"是做不到的，不要在 CNB 上找部署入口。

2. **CNB 仓库主页"不展示"的原因**：根目录有 index.html 会被识别为
   `useIndexPage: true`（index 页面模式），主页不再显示文件列表，且平台本身不能托管。

3. **Cloudflare Workers 可以托管静态站**，且是用户已验证可行的路径
   （用户已有账号 michoney68@gmail.com，wrangler 已 OAuth 登录）。

## 二、部署方案：Cloudflare Workers 静态托管

### 前置条件
- Cloudflare 账号 + wrangler 已登录：`npx wrangler whoami`
- 项目是纯静态站点（HTML/CSS/JS，无构建步骤）

### 步骤

**1. 在仓库根目录创建 `wrangler.toml`：**
```toml
name = "edystudio"
compatibility_date = "2025-06-01"

[assets]
directory = "dist"          # 指向干净的发布目录（不是仓库根目录！）
not_found_handling = "404-page"
```

**2. 创建 `deploy.sh`（构建干净发布目录 + 部署）：**
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
rsync -a --exclude '.git' --exclude '.clawhub' --exclude '.DS_Store' \
  --exclude 'AI-work' --exclude 'artifacts' --exclude 'tools' \
  --exclude '*.md' --exclude 'wrangler.toml' --exclude 'deploy.sh' --exclude 'dist' \
  ./ dist/
npx wrangler deploy
```

**3. 部署：** `./deploy.sh`

**4. 验证：** `curl -I https://<worker名>.michoney68.workers.dev/`

### 关键坑（wrangler 4.x）
- **assets 配置没有 `exclude` 字段**——必须在 wrangler.toml 的 schema 里没有；
  排除文件靠"构建干净目录"（rsync 到 dist/）实现。
- **assets-only Worker 不能设置 `binding`**（"Cannot use assets with a binding in an
  assets-only Worker"）——纯静态站点不要写 binding。
- **workers.dev 域名国内访问不稳定**（可能被墙）：
  - 症状：`curl` 返回 000 / 连接失败，但 DNS 解析正常
  - 解决：给 worker 绑定自定义域名（通过 Cloudflare 代理的域名国内一般可访问）

## 三、已完成的线上成果

| 项目 | 地址 |
|------|------|
| edystudio 静态站 | https://edystudio.michoney68.workers.dev |
| 数字化树木（ARBOR//OS + AI 大脑） | https://urban-tree-ai-demo.michoney68.workers.dev/ai-brain |

## 四、国内可访问的替代托管方案（如需要更稳）

| 方案 | 国内稳定性 | 需要 |
|------|-----------|------|
| Gitee Pages | ✅ 稳定 | 码云账号实名 + 建仓导入 |
| 腾讯云 COS 静态网站 | ✅ 稳定 | 腾讯云账号 + 密钥 |
| CF Workers + 自定义域名 | ⚠️ 一般 | 自有域名（可绑国内 CDN 前） |

## 五、给用户的后续建议

- workers.dev 打不开 → 绑自定义域名是最快解法
- 如需 CNB 侧自动化：可用 .cnb.yml 配置 CI（构建 + 制品归档），但托管仍需 CF
