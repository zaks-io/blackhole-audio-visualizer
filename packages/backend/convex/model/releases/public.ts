import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

const ROLES_CLAIM = "neuron/roles";

async function requireAdmin(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const roles = ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
  if (!roles.includes("admin")) {
    throw new Error("Not authorized");
  }
  return identity as { tokenIdentifier: string };
}

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createRelease = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    platform: v.union(v.literal("windows"), v.literal("macos")),
    version: v.string(),
    isLatest: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Auto-unset previous latest for this platform if setting new one as latest
    if (args.isLatest) {
      const previousLatest = await ctx.db
        .query("releases")
        .withIndex("by_platform_latest", (q) =>
          q.eq("platform", args.platform).eq("isLatest", true)
        )
        .first();

      if (previousLatest) {
        await ctx.db.patch(previousLatest._id, { isLatest: false });
      }
    }

    const releaseId = await ctx.db.insert("releases", {
      storageId: args.storageId,
      fileName: args.fileName,
      platform: args.platform,
      version: args.version,
      isLatest: args.isLatest,
      uploadedBy: user._id,
      downloadCount: 0,
    });

    return { releaseId };
  },
});

export const deleteRelease = mutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found");
    }

    await ctx.storage.delete(release.storageId);
    await ctx.db.delete(args.releaseId);

    return { success: true };
  },
});

export const setLatest = mutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found");
    }

    // Unset previous latest for this platform
    const previousLatest = await ctx.db
      .query("releases")
      .withIndex("by_platform_latest", (q) =>
        q.eq("platform", release.platform).eq("isLatest", true)
      )
      .first();

    if (previousLatest && previousLatest._id !== args.releaseId) {
      await ctx.db.patch(previousLatest._id, { isLatest: false });
    }

    // Set this release as latest
    await ctx.db.patch(args.releaseId, { isLatest: true });

    return { success: true };
  },
});

export const getReleases = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) {
      return [];
    }

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_platform")
      .order("desc")
      .collect();

    const releasesWithUrls = await Promise.all(
      releases.map(async (release) => ({
        ...release,
        url: await ctx.storage.getUrl(release.storageId),
      }))
    );

    return releasesWithUrls;
  },
});

export const getLatestByPlatform = query({
  args: { platform: v.union(v.literal("windows"), v.literal("macos")) },
  handler: async (ctx, args) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_platform_latest", (q) => q.eq("platform", args.platform).eq("isLatest", true))
      .first();

    if (!release) {
      return null;
    }

    const url = await ctx.storage.getUrl(release.storageId);

    return {
      ...release,
      url,
    };
  },
});

export const getReleaseByPlatformVersion = query({
  args: {
    platform: v.union(v.literal("windows"), v.literal("macos")),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_platform_version", (q) =>
        q.eq("platform", args.platform).eq("version", args.version)
      )
      .first();

    if (!release) {
      return null;
    }

    const url = await ctx.storage.getUrl(release.storageId);

    return {
      ...release,
      url,
    };
  },
});

export const incrementDownloadCount = mutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) return;
    await ctx.db.patch(args.releaseId, {
      downloadCount: (release.downloadCount ?? 0) + 1,
    });
  },
});
