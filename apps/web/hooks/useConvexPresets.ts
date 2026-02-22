"use client";

import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";
import type { Id } from "@blackhole/backend/convex/_generated/dataModel";
import type { ConvexPreset, PresetParameter } from "@/components/ProducerMode/types";

export function useConvexPresets() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const myPresets = useQuery(api.model.presets.public.getMyPresets, isAuthenticated ? {} : "skip");

  const publicPresets = useQuery(api.model.presets.public.getPublicPresets);

  const createPresetMutation = useMutation(api.model.presets.public.createPreset);
  const updatePresetMutation = useMutation(api.model.presets.public.updatePreset);
  const deletePresetMutation = useMutation(api.model.presets.public.deletePreset);

  const createPreset = async (
    name: string,
    colorPalette: string,
    parameters: PresetParameter[],
    isPublic: boolean
  ) => {
    return createPresetMutation({ name, colorPalette, parameters, isPublic });
  };

  const updatePreset = async (
    presetId: string,
    updates: {
      name?: string;
      colorPalette?: string;
      parameters?: PresetParameter[];
      isPublic?: boolean;
    }
  ) => {
    return updatePresetMutation({
      presetId: presetId as Id<"presets">,
      ...updates,
    });
  };

  const deletePreset = async (presetId: string) => {
    return deletePresetMutation({ presetId: presetId as Id<"presets"> });
  };

  return {
    presets: (myPresets ?? []) as ConvexPreset[],
    publicPresets: (publicPresets ?? []) as ConvexPreset[],
    isLoading: authLoading || (isAuthenticated && myPresets === undefined),
    isAuthenticated,
    createPreset,
    updatePreset,
    deletePreset,
  };
}
