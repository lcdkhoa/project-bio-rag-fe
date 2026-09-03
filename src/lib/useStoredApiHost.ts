"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_API_HOST,
  getCustomApiHost,
  resetCustomApiHost,
  setCustomApiHost,
  subscribeApiHost,
} from "./api";

function getServerSnapshot(): string | null {
  return null;
}

/**
 * Hook quản lý và theo dõi URL máy chủ API trong ứng dụng.
 *
 * Sử dụng `useSyncExternalStore` để đảm bảo đồng bộ tức thì giữa các component
 * và giữa các tab trình duyệt, tránh lệch dữ liệu giữa Server Rendering và Client Hydration.
 */
export function useStoredApiHost() {
  const customHost = useSyncExternalStore(
    subscribeApiHost,
    getCustomApiHost,
    getServerSnapshot,
  );

  const apiHost = customHost || DEFAULT_API_HOST;
  const isCustom = Boolean(customHost);

  const setHost = useCallback((host: string) => {
    setCustomApiHost(host);
  }, []);

  const resetHost = useCallback(() => {
    resetCustomApiHost();
  }, []);

  return {
    apiHost,
    customHost,
    isCustom,
    defaultHost: DEFAULT_API_HOST,
    setHost,
    resetHost,
  };
}
