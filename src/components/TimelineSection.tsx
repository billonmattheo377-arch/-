import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { CalendarRange, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteEvent, saveEvent, uploadPhoto } from "../lib/api";
import { formatDate, todayKey } from "../lib/dates";
import type { Photo, TimelineEvent, TimelineEventInput, WorkspaceData } from "../types";
import { ConfirmDialog, EmptyState, Modal, PageHeader, useToast } from "./ui";

function blankEvent(): TimelineEventInput {
  return {
    title: "",
    event_date: todayKey(),
    description: "",
    photoIds: [],
  };
}

export function TimelineSection({
  data,
  userId,
  onRefresh,
  onOpenPhoto,
}: {
  data: WorkspaceData;
  userId: string;
  onRefresh: () => Promise<unknown>;
  onOpenPhoto: (photoId: string) => void;
}) {
  const [editing, setEditing] = useState<TimelineEvent | "new" | null>(null);
  const [deleting, setDeleting] = useState<TimelineEvent | null>(null);
  const [form, setForm] = useState<TimelineEventInput>(blankEvent);
  const [working, setWorking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const photoMap = useMemo(() => new Map(data.photos.map((photo) => [photo.id, photo])), [data.photos]);

  const openNew = () => {
    setForm(blankEvent());
    setEditing("new");
    setError(null);
  };

  const openEdit = (event: TimelineEvent) => {
    setForm({
      title: event.title,
      event_date: event.event_date,
      description: event.description,
      photoIds: data.eventPhotos
        .filter((relation) => relation.event_id === event.id)
        .map((relation) => relation.photo_id),
    });
    setEditing(event);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("给这段回忆写个标题吧");
      return;
    }
    setWorking(true);
    try {
      await saveEvent(data.space.id, userId, form, editing !== "new" && editing ? editing.id : undefined);
      await onRefresh();
      showToast(editing === "new" ? "时光记录已加入" : "时光记录已更新");
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setWorking(false);
    }
  };

  const uploadForEvent = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setUploading(true);
    setError(null);
    const uploadedIds: string[] = [];
    try {
      for (const file of files) {
        const photo = await uploadPhoto(data.space.id, userId, { file, shotAt: null });
        uploadedIds.push(photo.id);
      }
      setForm((current) => ({ ...current, photoIds: [...current.photoIds, ...uploadedIds] }));
      await onRefresh();
      showToast(`已上传 ${files.length} 张照片`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "照片上传失败");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteEvent(deleting.id);
      await onRefresh();
      setDeleting(null);
      showToast("时光记录已删除");
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "删除失败", "error");
    }
  };

  return (
    <section className="section-view">
      <PageHeader
        eyebrow="一起走过"
        title="时光轴"
        description="按发生时记录大事，也把当时的照片留在这里。"
        action={
          <button className="button button--primary" type="button" onClick={openNew}>
            <Plus size={17} /> 记录事件
          </button>
        }
      />

      {!data.events.length ? (
        <EmptyState
          icon={<CalendarRange size={25} />}
          title="时光轴还是空白"
          description="第一次旅行、一次普通但开心的见面，都可以从这里写起。"
          action={
            <button className="button button--primary" type="button" onClick={openNew}>
              <Plus size={17} /> 写下第一件事
            </button>
          }
        />
      ) : (
        <div className="timeline">
          {data.events.map((event, index) => {
            const linkedPhotos = data.eventPhotos
              .filter((relation) => relation.event_id === event.id)
              .map((relation) => photoMap.get(relation.photo_id))
              .filter((photo): photo is Photo => Boolean(photo));

            return (
              <article className="timeline-item" key={event.id}>
                <div className="timeline-rail" aria-hidden="true">
                  <span />
                  {index < data.events.length - 1 ? <i /> : null}
                </div>
                <div className="timeline-card">
                  <div className="timeline-card__heading">
                    <div>
                      <time dateTime={event.event_date}>{formatDate(event.event_date)}</time>
                      <h2>{event.title}</h2>
                    </div>
                    <div className="card-actions">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => openEdit(event)}
                        aria-label={`编辑${event.title}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button icon-button--danger"
                        type="button"
                        onClick={() => setDeleting(event)}
                        aria-label={`删除${event.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {event.description ? <p>{event.description}</p> : null}
                  {linkedPhotos.length ? (
                    <div className="event-photo-row">
                      {linkedPhotos.slice(0, 4).map((photo) => (
                        <button
                          type="button"
                          key={photo.id}
                          onClick={() => onOpenPhoto(photo.id)}
                          aria-label="打开关联照片"
                        >
                          {photo.signedUrl ? <img src={photo.signedUrl} alt="" loading="lazy" /> : null}
                        </button>
                      ))}
                      {linkedPhotos.length > 4 ? <span>+{linkedPhotos.length - 4}</span> : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing ? (
        <Modal
          title={editing === "new" ? "记录一件事" : "编辑时光记录"}
          eyebrow="一起走过"
          onClose={() => setEditing(null)}
          width="large"
        >
          <form className="stack-form" onSubmit={submit}>
            <div className="form-grid">
              <label>
                <span>标题</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  maxLength={50}
                  placeholder="第一次一起看海"
                  autoFocus
                />
              </label>
              <label>
                <span>日期</span>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(event) => setForm({ ...form, event_date: event.target.value })}
                />
              </label>
            </div>
            <label>
              <span>这段回忆</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                maxLength={1500}
                rows={5}
                placeholder="那天发生了什么，哪些细节想一直记得？"
              />
            </label>

            <fieldset className="photo-picker">
              <legend>关联照片</legend>
              <div className="photo-picker__toolbar">
                <label className="button button--ghost button--compact">
                  <ImagePlus size={16} />
                  {uploading ? "上传中…" : "上传新照片"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    disabled={uploading}
                    onChange={(event) => void uploadForEvent(event)}
                  />
                </label>
                <span>已选 {form.photoIds.length} 张</span>
              </div>
              {data.photos.length ? (
                <div className="photo-picker__grid">
                  {data.photos.map((photo) => {
                    const selected = form.photoIds.includes(photo.id);
                    return (
                      <button
                        className={selected ? "is-selected" : ""}
                        type="button"
                        key={photo.id}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            photoIds: selected
                              ? current.photoIds.filter((id) => id !== photo.id)
                              : [...current.photoIds, photo.id],
                          }))
                        }
                        aria-pressed={selected}
                      >
                        {photo.signedUrl ? <img src={photo.signedUrl} alt="" loading="lazy" /> : null}
                        <span>{selected ? "已选择" : "选择"}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="subtle-text">相册里还没有照片，可以先上传。</p>
              )}
            </fieldset>

            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button className="button button--ghost" type="button" onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="button button--primary" type="submit" disabled={working || uploading}>
                {working ? "保存中…" : "保存记录"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="删除这段时光记录？"
          message={`“${deleting.title}”会被删除，已关联的照片仍保留在相册中。`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </section>
  );
}
