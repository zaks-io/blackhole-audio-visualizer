"use client";

import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Playlist, PlaylistWithPresets } from "@/components/ProducerMode/types";

export function useConvexPlaylists() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const myPlaylists = useQuery(
    api.model.playlists.public.getMyPlaylists,
    isAuthenticated ? {} : "skip"
  );

  const publicPlaylists = useQuery(api.model.playlists.public.getPublicPlaylists);

  const createPlaylistMutation = useMutation(api.model.playlists.public.createPlaylist);
  const updatePlaylistMutation = useMutation(api.model.playlists.public.updatePlaylist);
  const deletePlaylistMutation = useMutation(api.model.playlists.public.deletePlaylist);
  const addPresetMutation = useMutation(api.model.playlists.public.addPresetToPlaylist);
  const removePresetMutation = useMutation(api.model.playlists.public.removePresetFromPlaylist);
  const reorderPresetsMutation = useMutation(api.model.playlists.public.reorderPlaylistPresets);
  const updatePlaylistItemMutation = useMutation(api.model.playlists.public.updatePlaylistItem);
  const addCameraPresetMutation = useMutation(api.model.playlists.public.addCameraPreset);
  const updateCameraPresetMutation = useMutation(api.model.playlists.public.updateCameraPreset);
  const removeCameraPresetMutation = useMutation(api.model.playlists.public.removeCameraPreset);

  const createPlaylist = async (name: string, isPublic: boolean) => {
    return createPlaylistMutation({ name, isPublic });
  };

  const updatePlaylist = async (
    playlistId: string,
    updates: {
      name?: string;
      isPublic?: boolean;
      shuffle?: boolean;
      defaultWaitDuration?: number;
      defaultCameraDuration?: number;
    }
  ) => {
    return updatePlaylistMutation({
      playlistId: playlistId as Id<"playlists">,
      ...updates,
    });
  };

  const updatePlaylistItem = async (
    playlistId: string,
    presetId: string,
    waitDuration: number | undefined
  ) => {
    return updatePlaylistItemMutation({
      playlistId: playlistId as Id<"playlists">,
      presetId: presetId as Id<"presets">,
      waitDuration,
    });
  };

  const deletePlaylist = async (playlistId: string) => {
    return deletePlaylistMutation({ playlistId: playlistId as Id<"playlists"> });
  };

  const addPreset = async (playlistId: string, presetId: string) => {
    return addPresetMutation({
      playlistId: playlistId as Id<"playlists">,
      presetId: presetId as Id<"presets">,
    });
  };

  const removePreset = async (playlistId: string, presetId: string) => {
    return removePresetMutation({
      playlistId: playlistId as Id<"playlists">,
      presetId: presetId as Id<"presets">,
    });
  };

  const reorderPresets = async (playlistId: string, presetIds: string[]) => {
    return reorderPresetsMutation({
      playlistId: playlistId as Id<"playlists">,
      presetIds: presetIds as Id<"presets">[],
    });
  };

  const addCameraPreset = async (playlistId: string, cameraMode: string, duration?: number) => {
    return addCameraPresetMutation({
      playlistId: playlistId as Id<"playlists">,
      cameraMode,
      duration,
    });
  };

  const updateCameraPreset = async (playlistId: string, index: number, duration?: number) => {
    return updateCameraPresetMutation({
      playlistId: playlistId as Id<"playlists">,
      index,
      duration,
    });
  };

  const removeCameraPreset = async (playlistId: string, index: number) => {
    return removeCameraPresetMutation({
      playlistId: playlistId as Id<"playlists">,
      index,
    });
  };

  return {
    playlists: (myPlaylists ?? []) as Playlist[],
    publicPlaylists: (publicPlaylists ?? []) as Playlist[],
    isLoading: authLoading || (isAuthenticated && myPlaylists === undefined),
    isAuthenticated,
    createPlaylist,
    updatePlaylist,
    updatePlaylistItem,
    deletePlaylist,
    addPreset,
    removePreset,
    reorderPresets,
    addCameraPreset,
    updateCameraPreset,
    removeCameraPreset,
  };
}

export function usePlaylistWithPresets(playlistId: string | null) {
  const playlist = useQuery(
    api.model.playlists.public.getPlaylistWithPresets,
    playlistId ? { playlistId: playlistId as Id<"playlists"> } : "skip"
  );

  return {
    playlist: playlist as PlaylistWithPresets | null | undefined,
    isLoading: playlistId !== null && playlist === undefined,
  };
}
