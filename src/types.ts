export type AppSection = "home" | "anniversaries" | "timeline" | "gallery" | "about";

export interface Space {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Member {
  space_id: string;
  user_id: string;
  display_name: string;
  created_at: string;
}

export interface Anniversary {
  id: string;
  space_id: string;
  title: string;
  anniversary_date: string;
  note: string;
  recurring: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  space_id: string;
  title: string;
  event_date: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  space_id: string;
  storage_path: string;
  shot_at: string | null;
  created_by: string;
  created_at: string;
  signedUrl?: string;
}

export interface Comment {
  id: string;
  photo_id: string;
  space_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface AboutPanel {
  id: string;
  space_id: string;
  position: 0 | 1;
  title: string;
  content: string;
  updated_by: string | null;
  version: number;
  updated_at: string;
}

export interface WorkspaceData {
  space: Space;
  members: Member[];
  anniversaries: Anniversary[];
  events: TimelineEvent[];
  eventPhotos: { event_id: string; photo_id: string }[];
  photos: Photo[];
  comments: Comment[];
  aboutPanels: AboutPanel[];
}

export interface AnniversaryInput {
  title: string;
  anniversary_date: string;
  note: string;
  recurring: boolean;
}

export interface TimelineEventInput {
  title: string;
  event_date: string;
  description: string;
  photoIds: string[];
}

export interface PhotoInput {
  file: File;
  shotAt: string | null;
}

export interface CreateSpaceResult {
  space_id: string;
  space_name: string;
  invite_code: string;
}
