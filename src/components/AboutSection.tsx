import { useEffect, useRef, useState } from "react";
import { Feather, RefreshCw } from "lucide-react";
import { saveAboutPanel } from "../lib/api";
import { formatDateTime } from "../lib/dates";
import { saveStatusLabel, type SaveStatus } from "../lib/saveStatus";
import type { AboutPanel, WorkspaceData } from "../types";
import { PageHeader } from "./ui";

export function AboutSection({
  data,
  userId,
  onRefresh,
}: {
  data: WorkspaceData;
  userId: string;
  onRefresh: () => Promise<unknown>;
}) {
  return (
    <section className="section-view">
      <PageHeader
        eyebrow="写给你们"
        title="关于我们"
        description="两栏手记会自动保存。你们都可以写，也都可以接着对方的话写。"
      />
      <div className="about-grid">
        {data.aboutPanels.map((panel) => (
          <AboutEditor key={panel.id} panel={panel} userId={userId} onRefresh={onRefresh} />
        ))}
      </div>
    </section>
  );
}

function AboutEditor({
  panel,
  userId,
  onRefresh,
}: {
  panel: AboutPanel;
  userId: string;
  onRefresh: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState({ title: panel.title, content: panel.content });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(panel.version);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const latestDraftRef = useRef(draft);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (dirtyRef.current || savingRef.current) return;
    const nextDraft = { title: panel.title, content: panel.content };
    latestDraftRef.current = nextDraft;
    setDraft(nextDraft);
    versionRef.current = panel.version;
  }, [panel.id, panel.title, panel.content, panel.version]);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    [],
  );

  const valuesEqual = (
    left: { title: string; content: string },
    right: { title: string; content: string },
  ) => left.title === right.title && left.content === right.content;

  const flush = async () => {
    if (savingRef.current || !dirtyRef.current) return;
    const valuesBeingSaved = latestDraftRef.current;
    let shouldRetry = true;
    savingRef.current = true;
    setStatus("saving");
    setError(null);

    try {
      const saved = await saveAboutPanel(
        { ...panel, version: versionRef.current },
        valuesBeingSaved,
        userId,
      );
      versionRef.current = saved.version;

      if (valuesEqual(latestDraftRef.current, valuesBeingSaved)) {
        dirtyRef.current = false;
        setStatus("saved");
        void onRefresh();
      } else {
        setStatus("dirty");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "保存失败";
      shouldRetry = false;
      setError(message);
      setStatus(message.includes("另一台设备") ? "conflict" : "error");
    } finally {
      savingRef.current = false;
      if (shouldRetry && dirtyRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => void flush(), 120);
      }
    }
  };

  const scheduleSave = (values: { title: string; content: string }) => {
    dirtyRef.current = true;
    setDraft(values);
    latestDraftRef.current = values;
    setStatus("dirty");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), 700);
  };

  const reload = async () => {
    window.clearTimeout(timerRef.current);
    dirtyRef.current = false;
    const nextDraft = { title: panel.title, content: panel.content };
    setDraft(nextDraft);
    latestDraftRef.current = nextDraft;
    setStatus("idle");
    setError(null);
    await onRefresh();
  };

  return (
    <article className="about-card">
      <header>
        <div className="about-card__icon">
          <Feather size={18} />
        </div>
        <input
          value={draft.title}
          onChange={(event) => scheduleSave({ ...draft, title: event.target.value })}
          maxLength={30}
          aria-label="手记标题"
        />
        <span className={`save-status save-status--${status}`}>{saveStatusLabel(status)}</span>
      </header>
      <textarea
        value={draft.content}
        onChange={(event) => scheduleSave({ ...draft, content: event.target.value })}
        maxLength={5000}
        placeholder="写下此刻想说的话…"
        aria-label={`${draft.title}内容`}
      />
      <footer>
        <span>{panel.updated_by ? `最近更新于 ${formatDateTime(panel.updated_at)}` : "等待写下第一句话"}</span>
        {status === "conflict" ? (
          <button className="text-button" type="button" onClick={() => void reload()}>
            <RefreshCw size={14} /> 重新加载
          </button>
        ) : null}
        {error && status === "error" ? <span className="form-error">{error}</span> : null}
      </footer>
    </article>
  );
}
