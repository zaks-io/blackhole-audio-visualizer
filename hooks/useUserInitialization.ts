import { useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useUserInitialization() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const initializeUser = useMutation(api.model.users.public.initializeUser);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading && !isInitializing.current) {
      isInitializing.current = true;
      initializeUser().catch((error) => {
        console.error("Failed to initialize user:", error);
        isInitializing.current = false;
      });
    }
  }, [isAuthenticated, isLoading, initializeUser]);
}
