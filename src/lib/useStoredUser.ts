"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "rag_user_name";

/**
 * Tên người dùng lưu trong `localStorage`, đọc theo đúng cách React khuyến nghị
 * cho một kho dữ liệu NGOÀI React.
 *
 * Bản trước dùng `useEffect` + hai `setState` gọi đồng bộ ngay trong thân effect,
 * kèm một cờ `isMounted` để tránh lệch giữa HTML dựng sẵn trên máy chủ và lần
 * vẽ đầu tiên trên trình duyệt. Cách đó khiến toàn trang trả về `null` ở lượt
 * vẽ đầu (màn hình trắng một nhịp) và bị `react-hooks/set-state-in-effect` bắt
 * lỗi.
 *
 * `useSyncExternalStore` sinh ra đúng cho việc này: nó nhận một ảnh chụp riêng
 * cho phía máy chủ (`null`, vì ở đó không có `localStorage`), nên React tự lo
 * phần khác biệt mà không cần cờ thủ công nào.
 */

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Tab khác đăng nhập / đăng xuất thì tab này cũng phải đổi theo.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // Chế độ riêng tư hoặc trình duyệt chặn lưu trữ: coi như chưa đăng nhập,
    // KHÔNG để văng lỗi làm trắng cả trang.
    return null;
  }
}

/** Phía máy chủ không có `localStorage`; phải trả một giá trị ỔN ĐỊNH. */
function getServerSnapshot(): string | null {
  return null;
}

export function useStoredUser() {
  const userName = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = useCallback((name: string) => {
    try {
      localStorage.setItem(KEY, name);
    } catch {
      /* không lưu được thì phiên này vẫn dùng được, chỉ không nhớ lần sau */
    }
    emit();
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* như trên */
    }
    emit();
  }, []);

  return { userName, login, logout };
}
