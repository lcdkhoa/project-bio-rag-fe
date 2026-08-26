"use client";

import { useState } from "react";
import Login from "@/components/Login";
import ChatInterface from "@/components/ChatInterface";
import ImageModal from "@/components/ImageModal";
import type { ImageData } from "@/components/ImageModal";
import { useStoredUser } from "@/lib/useStoredUser";

export default function Home() {
  const { userName, login, logout } = useStoredUser();
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  return (
    <main className="flex-1 flex flex-col items-center overflow-hidden">
      {userName ? (
        <ChatInterface
          userName={userName}
          onLogout={logout}
          onImageClick={(img) => setSelectedImage(img)}
        />
      ) : (
        <Login onLogin={login} />
      )}

      {/* Cửa sổ xem hình dùng chung cho cả trang */}
      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage}
      />
    </main>
  );
}
