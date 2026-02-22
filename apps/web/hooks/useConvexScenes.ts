"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";
import type { Id, Doc } from "@blackhole/backend/convex/_generated/dataModel";

export type Scene = Doc<"scenes">;
export type SceneConversation = Doc<"sceneConversations">;
export type Composition = Doc<"compositions">;
export type GeneratedSong = Doc<"generatedSongs">;

export interface GeneratedSongWithDetails extends GeneratedSong {
  composition: Composition | null;
  audioUrl?: string | null;
}

export interface SceneWithDetails extends Scene {
  audioUrl: string | null;
  audioDurationMs: number;
  compositionPlan: Composition | null;
  song: GeneratedSong | null;
  playlist: {
    _id: Id<"playlists">;
    name: string;
    items: Array<{
      presetId: Id<"presets">;
      waitDuration?: number;
    }>;
    presets: Array<Doc<"presets"> | null>;
  } | null;
}

export interface CompositionPlan {
  positive_global_styles: string[];
  negative_global_styles: string[];
  sections: Array<{
    section_name: string;
    positive_local_styles: string[];
    negative_local_styles: string[];
    duration_ms: number;
    lines: string[];
  }>;
}

export function useConvexScenes() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const myScenes = useQuery(api.model.scenes.public.getMyScenes, isAuthenticated ? {} : "skip");

  const publicScenes = useQuery(api.model.scenes.public.getPublicScenes);

  const saveSceneMutation = useMutation(api.model.scenes.public.saveScene);
  const updateSceneMutation = useMutation(api.model.scenes.public.updateScene);
  const deleteSceneMutation = useMutation(api.model.scenes.public.deleteScene);
  const updateConversationTitleMutation = useMutation(
    api.model.scenes.public.updateConversationTitle
  );
  const linkConversationMutation = useMutation(api.model.scenes.public.linkConversationToScene);

  const createSceneThreadAction = useAction(api.model.scenes.public.createSceneThread);
  const sendSceneMessageAction = useAction(api.model.scenes.public.sendSceneMessage);
  const startSongGenerationAction = useAction(api.model.scenes.public.startSongGeneration);
  const triggerTranscriptionAction = useAction(api.model.transcriptions.public.trigger);

  const createSceneThread = async (sceneId?: string) => {
    return createSceneThreadAction({ sceneId: sceneId as Id<"scenes"> | undefined });
  };

  const sendSceneMessage = async (threadId: string, prompt: string, sceneId?: string) => {
    return sendSceneMessageAction({
      threadId,
      prompt,
      sceneId: sceneId as Id<"scenes"> | undefined,
    });
  };

  const startSongGeneration = async (songId: Id<"generatedSongs">) => {
    return startSongGenerationAction({ songId });
  };

  const triggerTranscription = async (songId: Id<"generatedSongs">) => {
    return triggerTranscriptionAction({ songId });
  };

  const saveScene = async (args: {
    name: string;
    description?: string;
    songId: Id<"generatedSongs">;
    playlistId: Id<"playlists">;
    threadId: string;
    isPublic: boolean;
  }) => {
    return saveSceneMutation(args);
  };

  const updateScene = async (
    sceneId: string,
    updates: {
      name?: string;
      description?: string;
      isPublic?: boolean;
    }
  ) => {
    return updateSceneMutation({
      sceneId: sceneId as Id<"scenes">,
      ...updates,
    });
  };

  const deleteScene = async (sceneId: string, deletePlaylist?: boolean) => {
    return deleteSceneMutation({
      sceneId: sceneId as Id<"scenes">,
      deletePlaylist,
    });
  };

  const updateConversationTitle = async (conversationId: string, title: string) => {
    return updateConversationTitleMutation({
      conversationId: conversationId as Id<"sceneConversations">,
      title,
    });
  };

  const linkConversationToScene = async (threadId: string, sceneId: string) => {
    return linkConversationMutation({
      threadId,
      sceneId: sceneId as Id<"scenes">,
    });
  };

  return {
    scenes: (myScenes ?? []) as Scene[],
    publicScenes: (publicScenes ?? []) as Scene[],
    isLoading: authLoading || (isAuthenticated && myScenes === undefined),
    isAuthenticated,
    // Thread & Chat
    createSceneThread,
    sendSceneMessage,
    // Generation
    startSongGeneration,
    triggerTranscription,
    // CRUD
    saveScene,
    updateScene,
    deleteScene,
    // Conversations
    updateConversationTitle,
    linkConversationToScene,
  };
}

export function useSceneWithDetails(sceneId: string | null) {
  const scene = useQuery(
    api.model.scenes.public.getSceneWithDetails,
    sceneId ? { sceneId: sceneId as Id<"scenes"> } : "skip"
  );

  return {
    scene: scene as SceneWithDetails | null | undefined,
    isLoading: sceneId !== null && scene === undefined,
  };
}

export function usePublicSceneWithDetails(sceneId: string | null) {
  const scene = useQuery(
    api.model.scenes.public.getSceneWithDetailsPublic,
    sceneId ? { sceneId: sceneId as Id<"scenes"> } : "skip"
  );

  return {
    scene: scene as SceneWithDetails | null | undefined,
    isLoading: sceneId !== null && scene === undefined,
  };
}

export function useSceneConversations(sceneId: string | null) {
  const conversations = useQuery(
    api.model.scenes.public.getSceneConversations,
    sceneId ? { sceneId: sceneId as Id<"scenes"> } : "skip"
  );

  return {
    conversations: (conversations ?? []) as SceneConversation[],
    isLoading: sceneId !== null && conversations === undefined,
  };
}

export function useAllConversations() {
  const conversations = useQuery(api.model.scenes.public.getAllConversations);
  return {
    conversations: (conversations ?? []) as SceneConversation[],
    isLoading: conversations === undefined,
  };
}

export function useMySongs() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const songs = useQuery(api.model.scenes.public.getMySongs, isAuthenticated ? {} : "skip");

  return {
    songs: (songs ?? []) as GeneratedSongWithDetails[],
    isLoading: authLoading || (isAuthenticated && songs === undefined),
  };
}

export function useThreadSongs(threadId: string | null) {
  const songs = useQuery(
    api.model.scenes.public.getSongsByThread,
    threadId ? { threadId } : "skip"
  );

  const completedSongs = (songs ?? []).filter(
    (s): s is GeneratedSong & { audioUrl: string } =>
      s.status === "completed" && typeof s.audioUrl === "string"
  );

  return {
    songs: songs ?? [],
    isLoading: threadId !== null && songs === undefined,
    completedSongs,
  };
}
