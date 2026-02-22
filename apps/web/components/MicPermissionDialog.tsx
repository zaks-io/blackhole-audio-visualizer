"use client";

interface MicPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MicPermissionDialog({ isOpen, onClose }: MicPermissionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md mx-4 overflow-hidden border border-gray-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 text-green-400"
              >
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Microphone Permission Required</h2>
          </div>

          <p className="text-gray-300 mb-4">
            This app needs microphone access to visualize audio. Please grant microphone permission
            in your browser or device settings.
          </p>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-200 mb-2">How to enable:</h3>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>On iOS: Settings → Safari → Microphone</li>
              <li>On desktop: Click the lock/info icon in the address bar</li>
              <li>Refresh the page after granting permission</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
