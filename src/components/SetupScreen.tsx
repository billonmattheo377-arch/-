import { useState, type FormEvent } from "react";
import { Check, Copy, HeartHandshake, KeyRound, LoaderCircle, Plus, Users } from "lucide-react";
import { createSpace, joinSpace } from "../lib/api";
import type { CreateSpaceResult } from "../types";
import { Modal, useToast } from "./ui";

export function ConfigScreen() {
  return (
    <main className="config-screen">
      <section className="config-card">
        <div className="brand-mark">
          <HeartHandshake size={24} />
        </div>
        <p className="eyebrow">还差最后一步</p>
        <h1>连接你们的共享空间</h1>
        <p>
          这个网站使用 Supabase 保存纪念日、照片和手记。创建项目后，在环境变量中填写以下
          URL 与匿名公钥。
        </p>
        <pre>
          <code>VITE_SUPABASE_URL=...</code>
          {"\n"}
          <code>VITE_SUPABASE_ANON_KEY=...</code>
        </pre>
        <p className="config-note">
          然后执行 <code>supabase/migrations/001_initial.sql</code>，并确保项目的 Anonymous
          Sign-Ins 已开启。
        </p>
      </section>
    </main>
  );
}

interface OnboardingProps {
  userId: string;
  initialInvite?: string;
  onReady: (firstSpace?: CreateSpaceResult) => void | Promise<void>;
}

export function Onboarding({ initialInvite = "", onReady }: OnboardingProps) {
  const [mode, setMode] = useState<"create" | "join">(initialInvite ? "join" : "create");
  const [displayName, setDisplayName] = useState("");
  const [spaceName, setSpaceName] = useState("我们的记录");
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanName = displayName.trim();
    if (!cleanName) {
      setError("先写下你的称呼吧");
      return;
    }

    setWorking(true);
    try {
      if (mode === "create") {
        const result = await createSpace(spaceName.trim() || "我们的记录", cleanName);
        await onReady(result);
      } else {
        const cleanCode = inviteCode.trim().toUpperCase();
        if (cleanCode.length < 6) {
          throw new Error("请输入完整的邀请码");
        }
        const result = await joinSpace(cleanCode, cleanName);
        showToast(`已加入「${result.space_name}」`);
        await onReady();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败，请稍后重试");
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="onboarding">
      <section className="onboarding__intro">
        <div className="brand-mark brand-mark--soft">
          <HeartHandshake size={25} />
        </div>
        <p className="eyebrow">两个人的私人空间</p>
        <h1>把值得记住的事，放在一起。</h1>
        <p>
          不显示公开主页，也不需要注册。创建空间后把邀请码发给对方，你们就能在不同设备上看到同一份记录。
        </p>
        <div className="feature-pips" aria-label="主要功能">
          <span>
            <KeyRound size={15} /> 纪念日倒计时
          </span>
          <span>
            <Users size={15} /> 双人共同编辑
          </span>
        </div>
      </section>

      <section className="onboarding__panel">
        <div className="segmented" role="tablist" aria-label="空间操作">
          <button
            type="button"
            className={mode === "create" ? "is-active" : ""}
            onClick={() => {
              setMode("create");
              setError(null);
            }}
          >
            <Plus size={16} /> 创建空间
          </button>
          <button
            type="button"
            className={mode === "join" ? "is-active" : ""}
            onClick={() => {
              setMode("join");
              setError(null);
            }}
          >
            <KeyRound size={16} /> 加入空间
          </button>
        </div>

        <form className="stack-form" onSubmit={submit}>
          <label>
            <span>你的称呼</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={16}
              placeholder="例如：小邵"
              autoComplete="nickname"
            />
          </label>

          {mode === "create" ? (
            <label>
              <span>空间名称</span>
              <input
                value={spaceName}
                onChange={(event) => setSpaceName(event.target.value)}
                maxLength={30}
                placeholder="我们的记录"
              />
            </label>
          ) : (
            <label>
              <span>共享邀请码</span>
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                maxLength={12}
                placeholder="例如：A8F2K9Q4"
                autoCapitalize="characters"
              />
            </label>
          )}

          {error ? <p className="form-error">{error}</p> : null}

          <button className="button button--primary button--wide" type="submit" disabled={working}>
            {working ? <LoaderCircle className="spin" size={17} /> : null}
            {mode === "create" ? "创建我们的空间" : "进入共享空间"}
          </button>
        </form>
        <p className="privacy-note">邀请码只用于加入空间，创建后请妥善保存。</p>
      </section>
    </main>
  );
}

export function InviteDialog({
  result,
  onClose,
}: {
  result: CreateSpaceResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(result.invite_code)}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("邀请码已复制");
    } catch {
      showToast("复制失败，请手动记下邀请码", "error");
    }
  };

  return (
    <Modal title="空间已经准备好了" eyebrow={result.space_name} onClose={onClose} width="small">
      <div className="invite-result">
        <p>把下面这串邀请码发给对方。它只会显示这一次。</p>
        <button className="invite-code" type="button" onClick={() => void copy(result.invite_code)}>
          <span>{result.invite_code}</span>
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
        <div className="form-actions">
          <button className="button button--ghost" type="button" onClick={() => void copy(inviteLink)}>
            <Copy size={16} /> 复制邀请链接
          </button>
          <button className="button button--primary" type="button" onClick={onClose}>
            我知道了
          </button>
        </div>
      </div>
    </Modal>
  );
}
