import { useCallback, useEffect, useRef, useState } from "react";
import { loadWorkspace, subscribeToWorkspace } from "../lib/api";
import { ensureAnonymousSession } from "../lib/supabase";
import type { WorkspaceData } from "../types";

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [id, workspace] = await Promise.all([ensureAnonymousSession(), loadWorkspace()]);
      setUserId(id);
      setData(workspace);
      setError(null);
      return workspace;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载失败，请稍后重试");
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    if (!data?.space.id) return;

    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void refresh(false), 180);
    };

    const unsubscribe = subscribeToWorkspace(data.space.id, scheduleRefresh);
    return () => {
      window.clearTimeout(refreshTimer.current);
      unsubscribe();
    };
  }, [data?.space.id, refresh]);

  return { data, userId, loading, error, refresh };
}
