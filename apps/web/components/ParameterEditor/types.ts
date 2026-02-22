export type {
  ParameterInfo,
  ParameterGroup,
} from "@blackhole/backend/convex/lib/visualizationParameters";
export type { EaseFunction } from "@/components/ProducerMode/types";

export type EditorMode = "dev" | "preset";

export interface ParameterEditorProps {
  mode: EditorMode;
  className?: string;
}

export interface ParameterGroupProps {
  name: string;
  id: string;
  storageKey: string;
  defaultCollapsed?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}

export interface ParameterSliderProps {
  path: string;
  storeKey: string;
  label: string;
  min: number;
  max: number;
  step: number;
  mode: EditorMode;
  duration: number;
}

export interface ParameterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface GlobalControlsProps {
  duration: number;
  ease: EaseFunction;
  onDurationChange: (duration: number) => void;
  onEaseChange: (ease: EaseFunction) => void;
}
