'use client';

interface MicToggleFabProps {
  isConnected: boolean;
  onToggle: () => void;
}

export function MicToggleFab({ isConnected, onToggle }: MicToggleFabProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full
        flex items-center justify-center
        transition-all duration-200
        shadow-lg hover:shadow-xl
        ${isConnected
          ? 'bg-green-500 hover:bg-green-600'
          : 'bg-gray-700 hover:bg-gray-600'
        }
      `}
      title={isConnected ? 'Microphone connected' : 'Connect microphone'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-6 h-6 ${isConnected ? 'text-white' : 'text-gray-300'}`}
      >
        {isConnected ? (
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
        ) : (
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14zM2.1 3.51a.996.996 0 000 1.41L7 9.83V11c0 2.76 2.24 5 5 5 .64 0 1.25-.13 1.82-.35l1.49 1.49c-.99.53-2.13.86-3.31.86-3.53 0-6.43-2.61-6.92-6H4c-.55 0-1 .45-1 1s.45 1 1 1h1.08c.52 3.13 3.13 5.51 6.42 5.92V21c0 .55.45 1 1 1s1-.45 1-1v-1.08c1.29-.17 2.48-.64 3.49-1.32l2.59 2.59a.996.996 0 101.41-1.41L3.51 3.51a.996.996 0 00-1.41 0z" />
        )}
      </svg>
    </button>
  );
}
