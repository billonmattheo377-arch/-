import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  AboutPanel,
  Anniversary,
  AnniversaryInput,
  Comment,
  CreateSpaceResult,
  Member,
  Photo,
  PhotoInput,
  Space,
  TimelineEvent,
  TimelineEventInput,
  WorkspaceData,
} from "../types";
import { compressImage, getDefaultShotDate } from "./images";
import { ensureAnonymousSession, getSupabase, PHOTO_BUCKET } from "./supabase";

function assertNoError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

async function getSingleRpcRow<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().rpc(name, args);
  assertNoError(error, "操作失败，请稍后重试");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("操作没有返回结果");
  return row as T;
}

export async function createSpace(spaceName: string, displayName: string): Promise<CreateSpaceResult> {
  return getSingleRpcRow<CreateSpaceResult>("create_space", {
    p_space_name: spaceName,
    p_display_name: displayName,
  });
}

export async function joinSpace(
  inviteCode: string,
  displayName: string,
): Promise<{ space_id: string; space_name: string }> {
  return getSingleRpcRow("join_space", {
    p_invite_code: inviteCode,
    p_display_name: displayName,
  });
}

export async function updateMemberName(spaceId: string, userId: string, displayName: string) {
  const { error } = await getSupabase()
    .from("members")
    .update({ display_name: displayName })
    .eq("space_id", spaceId)
    .eq("user_id", userId);
  assertNoError(error, "称呼更新失败");
}

export async function loadWorkspace(): Promise<WorkspaceData | null> {
  const userId = await ensureAnonymousSession();
  const supabase = getSupabase();
  const { data: membership, error: membershipError } = await supabase
    .from("members")
    .select("space_id, spaces(id, name, created_by, created_at)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  assertNoError(membershipError, "无法读取共享空间");
  if (!membership) return null;

  const nestedSpace = Array.isArray(membership.spaces) ? membership.spaces[0] : membership.spaces;
  const space = nestedSpace as Space | null;
  if (!space) throw new Error("共享空间不存在");

  const [
    membersResult,
    anniversariesResult,
    eventsResult,
    eventPhotosResult,
    photosResult,
    commentsResult,
    aboutResult,
  ] = await Promise.all([
    supabase.from("members").select("*").eq("space_id", space.id).order("created_at"),
    supabase
      .from("anniversaries")
      .select("*")
      .eq("space_id", space.id)
      .order("anniversary_date"),
    supabase.from("events").select("*").eq("space_id", space.id).order("event_date", { ascending: false }),
    supabase.from("event_photos").select("event_id, photo_id").eq("space_id", space.id),
    supabase.from("photos").select("*").eq("space_id", space.id).order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("*")
      .eq("space_id", space.id)
      .order("created_at", { ascending: true }),
    supabase.from("about_panels").select("*").eq("space_id", space.id).order("position"),
  ]);

  for (const result of [
    membersResult,
    anniversariesResult,
    eventsResult,
    eventPhotosResult,
    photosResult,
    commentsResult,
    aboutResult,
  ]) {
    assertNoError(result.error, "部分记录加载失败");
  }

  const photos = (photosResult.data ?? []) as Photo[];
  if (photos.length) {
    const paths = photos.map((photo) => photo.storage_path);
    const { data: signed, error: signedError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, 60 * 60);
    assertNoError(signedError, "照片暂时无法显示");

    const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
    for (const photo of photos) {
      photo.signedUrl = urlByPath.get(photo.storage_path) ?? undefined;
    }
  }

  return {
    space,
    members: (membersResult.data ?? []) as Member[],
    anniversaries: (anniversariesResult.data ?? []) as Anniversary[],
    events: (eventsResult.data ?? []) as TimelineEvent[],
    eventPhotos: (eventPhotosResult.data ?? []) as WorkspaceData["eventPhotos"],
    photos,
    comments: (commentsResult.data ?? []) as Comment[],
    aboutPanels: (aboutResult.data ?? []) as AboutPanel[],
  };
}

export async function saveAnniversary(
  spaceId: string,
  userId: string,
  input: AnniversaryInput,
  id?: string,
): Promise<void> {
  const supabase = getSupabase();
  const payload = {
    space_id: spaceId,
    title: input.title.trim(),
    anniversary_date: input.anniversary_date,
    note: input.note.trim(),
    recurring: input.recurring,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("anniversaries").update(payload).eq("id", id)
    : await supabase.from("anniversaries").insert(payload);
  assertNoError(result.error, "纪念日保存失败");
}

export async function deleteAnniversary(id: string): Promise<void> {
  const { error } = await getSupabase().from("anniversaries").delete().eq("id", id);
  assertNoError(error, "纪念日删除失败");
}

export async function saveEvent(
  spaceId: string,
  userId: string,
  input: TimelineEventInput,
  id?: string,
): Promise<string> {
  const supabase = getSupabase();
  const payload = {
    space_id: spaceId,
    title: input.title.trim(),
    event_date: input.event_date,
    description: input.description.trim(),
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  let eventId = id;
  if (id) {
    const { error } = await supabase.from("events").update(payload).eq("id", id);
    assertNoError(error, "事件保存失败");
    const { error: clearError } = await supabase.from("event_photos").delete().eq("event_id", id);
    assertNoError(clearError, "事件照片更新失败");
  } else {
    const { data, error } = await supabase.from("events").insert(payload).select("id").single();
    assertNoError(error, "事件保存失败");
    if (!data) throw new Error("事件保存失败");
    eventId = data.id as string;
  }

  if (!eventId) throw new Error("事件保存失败");
  if (input.photoIds.length) {
    const { error } = await supabase.from("event_photos").insert(
      input.photoIds.map((photoId) => ({
        event_id: eventId,
        photo_id: photoId,
        space_id: spaceId,
      })),
    );
    assertNoError(error, "事件照片关联失败");
  }

  return eventId;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from("events").delete().eq("id", id);
  assertNoError(error, "事件删除失败");
}

export async function uploadPhoto(
  spaceId: string,
  userId: string,
  input: PhotoInput,
): Promise<Photo> {
  const compressed = await compressImage(input.file);
  const extension = compressed.name.split(".").pop() || "webp";
  const storagePath = `${spaceId}/${crypto.randomUUID()}.${extension}`;
  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(storagePath, compressed, {
    contentType: compressed.type,
    cacheControl: "3600",
    upsert: false,
  });
  assertNoError(uploadError, "照片上传失败");

  const { data, error } = await supabase
    .from("photos")
    .insert({
      space_id: spaceId,
      storage_path: storagePath,
      shot_at: input.shotAt ?? getDefaultShotDate(input.file),
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    throw new Error(error.message || "照片信息保存失败");
  }
  if (!data) throw new Error("照片信息保存失败");

  return data as Photo;
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const supabase = getSupabase();
  const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  assertNoError(storageError, "照片文件删除失败");

  const { error } = await supabase.from("photos").delete().eq("id", photo.id);
  assertNoError(error, "照片记录删除失败");
}

export async function addComment(
  spaceId: string,
  photoId: string,
  authorId: string,
  content: string,
): Promise<void> {
  const { error } = await getSupabase().from("comments").insert({
    space_id: spaceId,
    photo_id: photoId,
    author_id: authorId,
    content: content.trim(),
  });
  assertNoError(error, "留言发布失败");
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await getSupabase().from("comments").delete().eq("id", id);
  assertNoError(error, "留言删除失败");
}

export async function saveAboutPanel(
  panel: AboutPanel,
  values: { title: string; content: string },
  userId: string,
): Promise<AboutPanel> {
  const { data, error } = await getSupabase()
    .from("about_panels")
    .update({
      title: values.title.trim() || `手记 ${panel.position + 1}`,
      content: values.content,
      updated_by: userId,
      version: panel.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", panel.id)
    .eq("version", panel.version)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message || "手记保存失败");
  if (!data) throw new Error("内容已在另一台设备上更新，请重新加载后再继续编辑");
  return data as AboutPanel;
}

export function subscribeToWorkspace(spaceId: string, onChange: () => void): () => void {
  const supabase = getSupabase();
  let channel: RealtimeChannel | null = supabase.channel(`space-${spaceId}`);
  const tables = ["anniversaries", "events", "photos", "comments", "about_panels", "members"];

  for (const table of tables) {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `space_id=eq.${spaceId}`,
      },
      onChange,
    );
  }

  channel = channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "event_photos", filter: `space_id=eq.${spaceId}` },
    onChange,
  );

  channel.subscribe();
  return () => {
    if (channel) void supabase.removeChannel(channel);
  };
}
