import { create } from "zustand";

interface AudioPlayerState {
  currentSongId: string | null;
  currentSongUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  play: (songId: string, url: string) => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
}

let audioElement: HTMLAudioElement | null = null;

function getAudioElement(store: {
  setState: (partial: Partial<AudioPlayerState>) => void;
}): HTMLAudioElement {
  if (!audioElement && typeof window !== "undefined") {
    audioElement = new Audio();

    audioElement.addEventListener("timeupdate", () => {
      store.setState({ currentTime: audioElement!.currentTime });
    });

    audioElement.addEventListener("loadedmetadata", () => {
      store.setState({ duration: audioElement!.duration });
    });

    audioElement.addEventListener("ended", () => {
      store.setState({
        currentSongId: null,
        currentSongUrl: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      });
    });

    audioElement.addEventListener("play", () => {
      store.setState({ isPlaying: true });
    });

    audioElement.addEventListener("pause", () => {
      store.setState({ isPlaying: false });
    });
  }
  return audioElement!;
}

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => {
  const storeApi = { setState: set };

  return {
    currentSongId: null,
    currentSongUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,

    play: (songId, url) => {
      const audio = getAudioElement(storeApi);

      // If same song and same URL, just resume
      if (get().currentSongId === songId && get().currentSongUrl === url) {
        audio.play();
        return;
      }

      // New song - stop current and play new
      audio.pause();
      audio.src = url;
      audio.currentTime = 0;

      set({
        currentSongId: songId,
        currentSongUrl: url,
        currentTime: 0,
        duration: 0,
      });

      audio.play();
    },

    pause: () => {
      const audio = getAudioElement(storeApi);
      audio.pause();
    },

    resume: () => {
      const audio = getAudioElement(storeApi);
      audio.play();
    },

    seek: (time) => {
      const audio = getAudioElement(storeApi);
      audio.currentTime = time;
      set({ currentTime: time });
    },
  };
});
