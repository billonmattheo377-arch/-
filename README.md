# 我们的记录

一个面向两个人的私密恋爱记录网站。支持纪念日倒计时、图文时光轴、共享相册与照片留言，以及双栏自动保存手记。

## 技术栈

- React 19、TypeScript、Vite
- Supabase Anonymous Auth、Postgres RLS、Storage 与 Realtime
- Vercel 静态部署

## 本地运行

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

默认开发地址是 `http://127.0.0.1:4173`。

## Supabase 配置

1. 创建 Supabase 项目。
2. 在 `Authentication > Providers` 中开启 **Anonymous Sign-Ins**。
3. 使用 Supabase CLI 执行迁移：

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

也可以在 SQL Editor 中依次执行 `supabase/migrations/001_initial.sql` 和 `002_member_permissions.sql`。

4. 从 `Project Settings > API` 获取项目 URL 和匿名公钥，写入 `.env`：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

迁移会创建私有 `love-photos` bucket、双人空间、邀请码哈希、所有业务表、Realtime 发布以及基于空间成员关系的 RLS 策略。

## 使用方式

1. 第一位用户填写称呼和空间名称，创建空间。
2. 保存创建后只显示一次的邀请码。
3. 第二位用户从邀请链接进入，或手动输入邀请码加入。
4. 两人都可以新增、编辑和删除纪念日、事件、照片、留言与手记。

邀请码数据库只保存 SHA-256 哈希。匿名身份保存在当前浏览器，不提供账号找回；清除浏览器数据前，应确保另一台设备仍可进入空间。

## 验证命令

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test e2e/smoke.spec.ts
```

完整的双人流程测试需要提供以下环境变量；未提供时会自动跳过：

```dotenv
E2E_SUPABASE_URL=https://YOUR_TEST_PROJECT.supabase.co
E2E_SUPABASE_ANON_KEY=YOUR_TEST_ANON_KEY
```

Playwright 当前配置使用 Windows 自带的 Microsoft Edge，以避免额外下载浏览器。

## 部署到 Vercel

- Framework Preset：Vite
- Build Command：`pnpm build`
- Output Directory：`dist`
- 环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

照片在浏览器中压缩为最长边 2560px 的 WebP 文件后再上传，不保留原图。免费 Supabase 项目的存储和带宽额度仍然适用。
