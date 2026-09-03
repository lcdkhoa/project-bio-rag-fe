"use client";

import { useState } from "react";
import Login from "@/components/Login";
import ChatInterface from "@/components/ChatInterface";
import ImageModal from "@/components/ImageModal";
import type { ImageData } from "@/components/ImageModal";
import ServerSettingsModal from "@/components/ServerSettingsModal";
import { useStoredUser } from "@/lib/useStoredUser";

export default function Home() {
  const { userName, login, logout } = useStoredUser();
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <main className="flex-1 flex flex-col items-center overflow-hidden">
      {userName ? (
        <ChatInterface
          userName={userName}
          onLogout={logout}
          onImageClick={(img) => setSelectedImage(img)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <Login
          onLogin={login}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Cửa sổ xem hình dùng chung cho cả trang */}
      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage}
      />

      {/* Cửa sổ cấu hình máy chủ API */}
      <ServerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
