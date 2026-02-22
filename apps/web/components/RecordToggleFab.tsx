"use client";

interface RecordToggleFabProps {
  isRecording: boolean;
  duration: number;
  disabled: boolean;
  onToggle: () => void;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RecordToggleFab({
  isRecording,
  duration,
  disabled,
  onToggle,
}: RecordToggleFabProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        fixed bottom-6 left-1/2 translate-x-[calc(-50%+2rem)] z-50
        ${isRecording ? "min-w-[100px] px-4" : "w-14"} h-14 rounded-full
        flex items-center justify-center gap-2
        transition-all duration-200
        shadow-lg hover:shadow-xl
        ${
          disabled
            ? "bg-gray-800 cursor-not-allowed opacity-50"
            : isRecording
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-700 hover:bg-gray-600"
        }
      `}
      title={
        disabled ? "Connect microphone first" : isRecording ? "Stop recording" : "Start recording"
      }
    >
      {isRecording ? (
        <>
          <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
          <span className="text-white text-sm font-mono">{formatDuration(duration)}</span>
        </>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 text-gray-300"
        >
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      )}
    </button>
  );
}
