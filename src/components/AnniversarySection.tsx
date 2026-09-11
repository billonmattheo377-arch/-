import { useState, type FormEvent } from "react";
import { CalendarDays, CalendarHeart, Pencil, Plus, Repeat2, Trash2 } from "lucide-react";
import { deleteAnniversary, saveAnniversary } from "../lib/api";
import { describeAnniversary, formatDate, sortAnniversaries, todayKey } from "../lib/dates";
import type { Anniversary, AnniversaryInput, WorkspaceData } from "../types";
import { ConfirmDialog, EmptyState, Modal, PageHeader, useToast } from "./ui";

const blankAnniversary = (): AnniversaryInput => ({
  title: "",
  anniversary_date: todayKey(),
  note: "",
  recurring: true,
});

export function AnniversarySection({
  data,
  userId,
  onRefresh,
}: {
  data: WorkspaceData;
  userId: string;
  onRefresh: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState<Anniversary | null | "new">(null);
  const [deleting, setDeleting] = useState<Anniversary | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AnniversaryInput>(blankAnniversary);
  const { showToast } = useToast();
  const displays = sortAnniversaries(data.anniversaries);

  const openNew = () => {
    setForm(blankAnniversary());
    setEditing("new");
    setError(null);
  };

  const openEdit = (anniversary: Anniversary) => {
    setForm({
      title: anniversary.title,
      anniversary_date: anniversary.anniversary_date,
      note: anniversary.note,
      recurring: anniversary.recurring,
    });
    setEditing(anniversary);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("给这个日子起个名字吧");
      return;
    }
    if (!form.anniversary_date) {
      setError("请选择日期");
      return;
    }

    setWorking(true);
    try {
      await saveAnniversary(
        data.space.id,
        userId,
        form,
        editing && editing !== "new" ? editing.id : undefined,
      );
      await onRefresh();
      setEditing(null);
      showToast(editing === "new" ? "纪念日已加入" : "纪念日已更新");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setWorking(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAnniversary(deleting.id);
      await onRefresh();
      showToast("纪念日已删除");
      setDeleting(null);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "删除失败", "error");
    }
  };

  return (
    <section className="section-view">
      <PageHeader
        eyebrow="重要日子"
        title="纪念日"
        description="记录开始、相遇和每一个值得倒数的日子。"
        action={
          <button className="button button--primary" type="button" onClick={openNew}>
            <Plus size={17} /> 新增纪念日
          </button>
        }
      />

      {!displays.length ? (
        <EmptyState
          icon={<CalendarHeart size={25} />}
          title="还没有纪念日"
          description="从一个你们最想记住的日期开始。"
          action={
            <button className="button button--primary" type="button" onClick={openNew}>
              <Plus size={17} /> 写下第一个日子
            </button>
          }
        />
      ) : (
        <div className="anniversary-grid">
          {displays.map(({ anniversary, days, years, label, nextDate }) => (
            <article className="anniversary-card" key={anniversary.id}>
              <div className="anniversary-card__date">
                <span>{parseDateParts(nextDate).month}</span>
                <strong>{parseDateParts(nextDate).day}</strong>
              </div>
              <div className="anniversary-card__body">
                <div className="card-title-row">
                  <h2>{anniversary.title}</h2>
                  <span className={`date-kind ${anniversary.recurring ? "is-recurring" : ""}`}>
                    {anniversary.recurring ? <Repeat2 size={13} /> : <CalendarDays size={13} />}
                    {anniversary.recurring ? "每年" : "一次"}
                  </span>
                </div>
                <p className="anniversary-countdown">{label}</p>
                <p className="meta-line">
                  {anniversary.recurring && years > 0 ? `第 ${years} 年 · ` : ""}
                  原日期 {formatDate(anniversary.anniversary_date)}
                </p>
                {anniversary.note ? <p className="anniversary-note">{anniversary.note}</p> : null}
              </div>
              <div className="card-actions">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => openEdit(anniversary)}
                  aria-label={`编辑${anniversary.title}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => setDeleting(anniversary)}
                  aria-label={`删除${anniversary.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <Modal
          title={editing === "new" ? "新增纪念日" : "编辑纪念日"}
          eyebrow="重要日子"
          onClose={() => setEditing(null)}
        >
          <form className="stack-form" onSubmit={submit}>
            <label>
              <span>名称</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                maxLength={40}
                placeholder="第一次见面"
                autoFocus
              />
            </label>
            <label>
              <span>日期</span>
              <input
                type="date"
                value={form.anniversary_date}
                onChange={(event) => setForm({ ...form, anniversary_date: event.target.value })}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.recurring}
                onChange={(event) => setForm({ ...form, recurring: event.target.checked })}
              />
              <span>
                <strong>每年重复</strong>
                <small>开启后自动显示下一次倒计时</small>
              </span>
            </label>
            <label>
              <span>说明（可选）</span>
              <textarea
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                maxLength={300}
                rows={4}
                placeholder="写下一点关于这个日子的记忆"
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button className="button button--ghost" type="button" onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="button button--primary" type="submit" disabled={working}>
                {working ? "保存中…" : "保存纪念日"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="删除这个纪念日？"
          message={`“${deleting.title}”将从你们的记录中移除。`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </section>
  );
}

function parseDateParts(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return {
    month: `${date.getMonth() + 1}月`,
    day: String(date.getDate()).padStart(2, "0"),
  };
}
