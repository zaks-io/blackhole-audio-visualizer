"use client";

import { useState, useRef, useEffect } from "react";
import type { AudioSourceType } from "@/hooks/useAudioSource";

interface MicToggleFabProps {
  isConnected: boolean;
  sourceType: AudioSourceType | null;
  canUseSystemAudio: boolean;
  onConnect: (sourceType: AudioSourceType) => void;
  onDisconnect: () => void;
}

export function MicToggleFab({
  isConnected,
  sourceType,
  canUseSystemAudio,
  onConnect,
  onDisconnect,
}: MicToggleFabProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClick = () => {
    if (isConnected) {
      onDisconnect();
    } else if (canUseSystemAudio) {
      setShowMenu(!showMenu);
    } else {
      onConnect("microphone");
    }
  };

  const handleSourceSelect = (type: AudioSourceType) => {
    setShowMenu(false);
    onConnect(type);
  };

  const getButtonColor = () => {
    if (!isConnected) return "bg-gray-700 hover:bg-gray-600";
    if (sourceType === "system") return "bg-purple-500 hover:bg-purple-600";
    return "bg-green-500 hover:bg-green-600";
  };

  const getTitle = () => {
    if (!isConnected) return "Connect audio";
    if (sourceType === "system") return "System audio connected";
    return "Microphone connected";
  };

  return (
    <div ref={menuRef} className="fixed bottom-6 left-1/2 -translate-x-[calc(50%+2rem)] z-50">
      {showMenu && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg shadow-xl overflow-hidden min-w-[160px]">
          <button
            onClick={() => handleSourceSelect("microphone")}
            className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 text-green-400"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
            Microphone
          </button>
          <button
            onClick={() => handleSourceSelect("system")}
            className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-3 transition-colors border-t border-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 text-purple-400"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
            System Audio
          </button>
        </div>
      )}
      <button
        onClick={handleClick}
        className={`
          w-14 h-14 rounded-full
          flex items-center justify-center
          transition-all duration-200
          shadow-lg hover:shadow-xl
          ${getButtonColor()}
        `}
        title={getTitle()}
      >
        {sourceType === "system" && isConnected ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6 text-white"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`w-6 h-6 ${isConnected ? "text-white" : "text-gray-300"}`}
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
          </svg>
        )}
      </button>
    </div>
  );
}
