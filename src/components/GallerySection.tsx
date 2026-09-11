import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Camera,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { addComment, deleteComment, deletePhoto, uploadPhoto } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/dates";
import type { Comment, Photo, WorkspaceData } from "../types";
import { ConfirmDialog, EmptyState, Modal, PageHeader, useToast } from "./ui";

export function GallerySection({
  data,
  userId,
  photoId,
  onOpenPhoto,
  onClosePhoto,
  onRefresh,
}: {
  data: WorkspaceData;
  userId: string;
  photoId: string | null;
  onOpenPhoto: (id: string) => void;
  onClosePhoto: () => void;
  onRefresh: () => Promise<unknown>;
}) {
  const [uploading, setUploading] = useState<{ completed: number; total: number } | null>(null);
  const [deleting, setDeleting] = useState<Photo | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const activePhoto = useMemo(
    () => data.photos.find((photo) => photo.id === photoId) ?? null,
    [data.photos, photoId],
  );
  const commentMap = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const item of data.comments) {
      const list = map.get(item.photo_id) ?? [];
      list.push(item);
      map.set(item.photo_id, list);
    }
    return map;
  }, [data.comments]);
  const memberNames = useMemo(
    () => new Map(data.members.map((member) => [member.user_id, member.display_name])),
    [data.members],
  );

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setUploading({ completed: 0, total: files.length });
    let completed = 0;
    let failed = 0;
    for (const file of files) {
      try {
        await uploadPhoto(data.space.id, userId, { file, shotAt: null });
      } catch {
        failed += 1;
      } finally {
        completed += 1;
        setUploading({ completed, total: files.length });
      }
    }
    await onRefresh();
    setUploading(null);
    if (failed) {
      showToast(`已上传 ${files.length - failed} 张，${failed} 张失败`, "error");
    } else {
      showToast(`已上传 ${files.length} 张照片`);
    }
  };

  const sendComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!activePhoto || !comment.trim()) return;
    setSending(true);
    try {
      await addComment(data.space.id, activePhoto.id, userId, comment);
      setComment("");
      await onRefresh();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "留言发布失败", "error");
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await deleteComment(id);
      await onRefresh();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "留言删除失败", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deletePhoto(deleting);
      setDeleting(null);
      onClosePhoto();
      await onRefresh();
      showToast("照片已删除");
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "照片删除失败", "error");
    }
  };

  const activeComments = activePhoto ? commentMap.get(activePhoto.id) ?? [] : [];

  return (
    <section className="section-view">
      <PageHeader
        eyebrow="照片记忆"
        title="相册"
        description="随时放进生活里的片段，也可以在每张照片下留一句话。"
        action={
          <label className="button button--primary">
            {uploading ? <LoaderCircle className="spin" size={17} /> : <UploadCloud size={17} />}
            {uploading ? `上传 ${uploading.completed}/${uploading.total}` : "上传照片"}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={Boolean(uploading)}
              onChange={(event) => void uploadFiles(event)}
            />
          </label>
        }
      />

      {!data.photos.length ? (
        <EmptyState
          icon={<Camera size={25} />}
          title="相册里还没有照片"
          description="一次选多张也可以，上传时会在浏览器里自动压缩。"
          action={
            <label className="button button--primary">
              <ImagePlus size={17} /> 从相册选择
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => void uploadFiles(event)}
              />
            </label>
          }
        />
      ) : (
        <div className="photo-grid">
          {data.photos.map((photo) => {
            const count = commentMap.get(photo.id)?.length ?? 0;
            return (
              <button className="photo-tile" type="button" key={photo.id} onClick={() => onOpenPhoto(photo.id)}>
                {photo.signedUrl ? <img src={photo.signedUrl} alt="" loading="lazy" /> : null}
                <span className="photo-tile__shade" />
                <span className="photo-tile__meta">
                  <span>{photo.shot_at ? formatDate(photo.shot_at) : "未注明日期"}</span>
                  {count ? (
                    <span>
                      <MessageCircle size={13} /> {count}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activePhoto ? (
        <Modal title="照片记忆" eyebrow={activePhoto.shot_at ? formatDate(activePhoto.shot_at) : "相册"} onClose={onClosePhoto} width="large">
          <div className="photo-view">
            <div className="photo-view__image">
              {activePhoto.signedUrl ? <img src={activePhoto.signedUrl} alt="" /> : null}
            </div>
            <div className="photo-view__side">
              <div className="photo-view__meta">
                <div>
                  <strong>{activePhoto.shot_at ? formatDate(activePhoto.shot_at) : "上传的照片"}</strong>
                  <span>{formatDateTime(activePhoto.created_at)} 上传</span>
                </div>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => setDeleting(activePhoto)}
                  aria-label="删除照片"
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div className="comment-list">
                <div className="comment-list__heading">
                  <MessageCircle size={16} />
                  <span>留言 {activeComments.length}</span>
                </div>
                {!activeComments.length ? (
                  <p className="subtle-text">这里还很安静，写下第一句话吧。</p>
                ) : (
                  activeComments.map((item) => (
                    <article className="comment" key={item.id}>
                      <div className="comment__avatar">
                        {(memberNames.get(item.author_id) || "我").slice(0, 1)}
                      </div>
                      <div>
                        <p>
                          <strong>{memberNames.get(item.author_id) || "我"}</strong>
                          <time>{formatDateTime(item.created_at)}</time>
                        </p>
                        <span>{item.content}</span>
                      </div>
                      <button
                        className="plain-icon-button"
                        type="button"
                        onClick={() => void removeComment(item.id)}
                        aria-label="删除留言"
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))
                )}
              </div>

              <form className="comment-form" onSubmit={sendComment}>
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={200}
                  placeholder="在这张照片下留句话…"
                />
                <button
                  className="icon-button icon-button--solid"
                  type="submit"
                  disabled={sending || !comment.trim()}
                  aria-label="发布留言"
                >
                  {sending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="删除这张照片？"
          message="照片、相关留言和事件关联都会被删除，无法恢复。"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </section>
  );
}
