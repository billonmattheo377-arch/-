import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookHeart,
  CalendarHeart,
  Camera,
  Clock3,
  Heart,
  Home,
  LoaderCircle,
  Settings,
  Users,
} from "lucide-react";
import { updateMemberName } from "./lib/api";
import { hasSupabaseConfig } from "./lib/supabase";
import type { AppSection, CreateSpaceResult } from "./types";
import { useWorkspace } from "./hooks/useWorkspace";
import { AboutSection } from "./components/AboutSection";
import { AnniversarySection } from "./components/AnniversarySection";
import { GallerySection } from "./components/GallerySection";
import { HomeSection } from "./components/HomeSection";
import { ConfigScreen, InviteDialog, Onboarding } from "./components/SetupScreen";
import { TimelineSection } from "./components/TimelineSection";
import { ErrorState, LoadingScreen, Modal, useToast } from "./components/ui";

const sections: Array<{ id: AppSection; label: string; icon: typeof Home }> = [
  { id: "home", label: "首页", icon: Home },
  { id: "anniversaries", label: "纪念日", icon: CalendarHeart },
  { id: "timeline", label: "时光轴", icon: Clock3 },
  { id: "gallery", label: "相册", icon: Camera },
  { id: "about", label: "关于我们", icon: BookHeart },
];

function readSection(): AppSection {
  const value = window.location.hash.replace("#", "") as AppSection;
  return sections.some((section) => section.id === value) ? value : "home";
}

function readInviteCode(): string {
  return new URLSearchParams(window.location.search).get("invite")?.trim().toUpperCase() ?? "";
}

export default function App() {
  const [section, setSection] = useState<AppSection>(readSection);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [invite, setInvite] = useState<CreateSpaceResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data, userId, loading, error, refresh } = useWorkspace();

  const navigate = (nextSection: AppSection) => {
    setSection(nextSection);
    if (nextSection !== "gallery") setActivePhotoId(null);
    window.history.replaceState(null, "", `#${nextSection}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onHashChange = () => setSection(readSection());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleReady = async (created?: CreateSpaceResult) => {
    if (created) setInvite(created);
    await refresh(true);
  };

  if (!hasSupabaseConfig) return <ConfigScreen />;
  if (loading && !data) return <LoadingScreen />;
  if (error && !data) {
    return (
      <main className="center-screen">
        <ErrorState
          message={error}
          action={
            <button className="button button--primary" type="button" onClick={() => void refresh(true)}>
              再试一次
            </button>
          }
        />
      </main>
    );
  }
  if (!data || !userId) {
    return (
      <>
        <Onboarding userId={userId ?? ""} initialInvite={readInviteCode()} onReady={handleReady} />
        {invite ? <InviteDialog result={invite} onClose={() => setInvite(null)} /> : null}
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => navigate("home")}>
          <span className="brand__mark">
            <Heart size={17} fill="currentColor" />
          </span>
          <span>
            <strong>{data.space.name}</strong>
            <small>我们的记录</small>
          </span>
        </button>
        <nav className="desktop-nav" aria-label="主要模块">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={section === item.id ? "is-active" : ""}
                type="button"
                key={item.id}
                onClick={() => navigate(item.id)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button
          className="header-members"
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="空间设置"
        >
          <span className="member-bubbles">
            {data.members.map((member) => (
              <span key={member.user_id} title={member.display_name}>
                {member.display_name.slice(0, 1)}
              </span>
            ))}
          </span>
          <Settings size={17} />
        </button>
      </header>

      <main className="app-main">
        {section === "home" ? (
          <HomeSection
            data={data}
            onNavigate={navigate}
            onOpenPhoto={(id) => {
              setActivePhotoId(id);
              navigate("gallery");
            }}
          />
        ) : null}
        {section === "anniversaries" ? (
          <AnniversarySection data={data} userId={userId} onRefresh={() => refresh(false)} />
        ) : null}
        {section === "timeline" ? (
          <TimelineSection
            data={data}
            userId={userId}
            onRefresh={() => refresh(false)}
            onOpenPhoto={(id) => {
              setActivePhotoId(id);
              navigate("gallery");
            }}
          />
        ) : null}
        {section === "gallery" ? (
          <GallerySection
            data={data}
            userId={userId}
            photoId={activePhotoId}
            onOpenPhoto={setActivePhotoId}
            onClosePhoto={() => setActivePhotoId(null)}
            onRefresh={() => refresh(false)}
          />
        ) : null}
        {section === "about" ? (
          <AboutSection data={data} userId={userId} onRefresh={() => refresh(false)} />
        ) : null}
      </main>

      <nav className="mobile-nav" aria-label="主要模块">
        {sections.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={section === item.id ? "is-active" : ""}
              type="button"
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {invite ? <InviteDialog result={invite} onClose={() => setInvite(null)} /> : null}
      {settingsOpen ? (
        <SettingsDialog
          data={data}
          userId={userId}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => refresh(false)}
        />
      ) : null}
    </div>
  );
}

function SettingsDialog({
  data,
  userId,
  onClose,
  onSaved,
}: {
  data: NonNullable<ReturnType<typeof useWorkspace>["data"]>;
  userId: string;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const ownMember = useMemo(
    () => data.members.find((member) => member.user_id === userId),
    [data.members, userId],
  );
  const [name, setName] = useState(ownMember?.display_name ?? "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("称呼不能为空");
      return;
    }
    setWorking(true);
    try {
      await updateMemberName(data.space.id, userId, name.trim());
      await onSaved();
      showToast("称呼已更新");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新失败");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal title="空间设置" eyebrow={data.space.name} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <div className="member-summary">
          <Users size={18} />
          <div>
            <strong>{data.members.length}/2 位成员</strong>
            <span>{data.members.map((member) => member.display_name).join("、")}</span>
          </div>
        </div>
        <label>
          <span>我的称呼</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={16} autoFocus />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-actions">
          <button className="button button--ghost" type="button" onClick={onClose}>
            取消
          </button>
          <button className="button button--primary" type="submit" disabled={working}>
            {working ? <LoaderCircle className="spin" size={16} /> : null}
            保存称呼
          </button>
        </div>
      </form>
      <p className="settings-note">
        当前浏览器已保存匿名身份。清除浏览器数据前，请确保另一台设备仍可进入空间。
      </p>
    </Modal>
  );
}
