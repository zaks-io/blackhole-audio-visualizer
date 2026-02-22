import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
  canvas: ReactNode;
  ui: ReactNode;
}

export default function AppLayout({ children, canvas, ui }: AppLayoutProps) {
  return (
    <div className="w-screen h-dvh relative bg-black">
      {/* Canvas slot - persistent, never remounts */}
      {canvas}
      {/* UI slot - changes based on route */}
      {ui}
      {/* Children - placeholder pages */}
      {children}
    </div>
  );
}
