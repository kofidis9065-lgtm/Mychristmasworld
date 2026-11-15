import { World, LandscapeType, PlacedObject } from './worldTypes';
import {
  AppUser,
  CloudSaveResult,
  saveWorldToCloudBackend,
  loadWorldFromCloudBackendResult,
} from '../auth/userAuthService';
import { DEFAULT_FREE_ASSET_IDS, isAssetUnlocked } from '../../game/assets/assetCatalog';
import { getGuestClaimedDailyGiftAssetIds } from '../gifts/giftService';

const GUEST_STORAGE_KEY = 'mcw_guest_world_v1';
const LEGACY_LOCAL_STORAGE_KEY = 'mcw_saved_world_v1';
const CLOUD_WORLD_CACHE_PREFIX = 'mcw_cloud_world_cache_';
const GUEST_ID = 'guest-local-user';

export const PRO_ONLY_LANDSCAPES: readonly LandscapeType[] = ['wonderworld'];

export function isProOnlyLandscape(landscape: LandscapeType): boolean {
  return PRO_ONLY_LANDSCAPES.includes(landscape);
}

/**
 * Safely switches an unentitled user out of any Pro-only landscape (e.g. 'wonderworld')
 * back to the default free landscape ('village'), while strictly preserving all placed
 * objects inside `landscapeDecorations.wonderworld` without deletion or corruption.
 */
export function enforceFreeLandscapeAccess(
  world: World,
  isProUser: boolean
): { world: World; switched: boolean } {
  if (isProUser || !isProOnlyLandscape(world.landscapeType)) {
    return { world, switched: false };
  }

  const existingDecorations: Record<LandscapeType, PlacedObject[]> = {
    village: JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS.village)),
    mountain: JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS.mountain)),
    river: JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS.river)),
    city: JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS.city)),
    wonderworld: [],
    ...(world.landscapeDecorations || {}),
  };

  // Preserve current Wonderworld objects cleanly before switching active view to 'village'
  const currentLandscapeObjects: PlacedObject[] = Array.isArray(world.placedObjects)
    ? JSON.parse(JSON.stringify(world.placedObjects))
    : [];
  existingDecorations[world.landscapeType] = currentLandscapeObjects;

  const fallbackVillageObjects: PlacedObject[] = Array.isArray(existingDecorations.village)
    ? JSON.parse(JSON.stringify(existingDecorations.village))
    : JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS.village));
  existingDecorations.village = fallbackVillageObjects;

  return {
    switched: true,
    world: {
      ...world,
      landscapeType: 'village',
      placedObjects: fallbackVillageObjects,
      landscapeDecorations: existingDecorations,
    },
  };
}

export const DEFAULT_LANDSCAPE_DECORATIONS: Record<LandscapeType, PlacedObject[]> = {
  village: [
    {
      id: 'village_tree_1',
      assetType: 'christmas_tree',
      name: 'Evergreen Christmas Tree',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1.2, 1.2, 1.2],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'village_gift_1',
      assetType: 'gift_box',
      name: 'Holiday Gift Box',
      position: [1.5, 0, 0.8],
      rotation: [0, 0.3, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'village_snowman_1',
      assetType: 'snowman',
      name: 'Frosty Snowman',
      position: [-2.2, 0, 1.0],
      rotation: [0, 0.4, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'village_lamp_1',
      assetType: 'street_lamp',
      name: 'Victorian Street Lamp',
      position: [2.8, 0, -2.5],
      rotation: [0, -0.2, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
  ],
  mountain: [
    {
      id: 'mountain_chalet_1',
      assetType: 'christmas_house',
      name: 'Cozy Timber Chalet',
      position: [0, 0, -1.5],
      rotation: [0, 0.2, 0],
      scale: [1.2, 1.2, 1.2],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'mountain_tree_1',
      assetType: 'christmas_tree',
      name: 'Evergreen Christmas Tree',
      position: [-3, 0, 1],
      rotation: [0, 0, 0],
      scale: [1.3, 1.3, 1.3],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'mountain_bench_1',
      assetType: 'park_bench',
      name: 'Snowy Park Bench',
      position: [2.5, 0, 1.5],
      rotation: [0, -0.5, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
  ],
  river: [
    {
      id: 'river_snowman_1',
      assetType: 'snowman',
      name: 'Frosty Snowman',
      position: [-2, 0, 1],
      rotation: [0, 0.2, 0],
      scale: [1.1, 1.1, 1.1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'river_train_1',
      assetType: 'christmas_train',
      name: 'Holiday Express Train',
      position: [1, 0, -1],
      rotation: [0, -0.4, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'river_lamp_1',
      assetType: 'street_lamp',
      name: 'Victorian Street Lamp',
      position: [3, 0, 2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
  ],
  city: [
    {
      id: 'city_tree_1',
      assetType: 'christmas_tree',
      name: 'Grand City Christmas Tree',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1.4, 1.4, 1.4],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'city_train_1',
      assetType: 'christmas_train',
      name: 'Holiday Express Train',
      position: [3, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      scale: [1.1, 1.1, 1.1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'city_lamp_1',
      assetType: 'street_lamp',
      name: 'Victorian Street Lamp',
      position: [-2.5, 0, -2.5],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'city_lamp_2',
      assetType: 'street_lamp',
      name: 'Victorian Street Lamp',
      position: [2.5, 0, -2.5],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      createdAt: '2026-10-24T00:00:00.000Z',
    },
  ],
  wonderworld: [],
};

export function getClaimedDailyGiftAssetIds(): string[] {
  return getGuestClaimedDailyGiftAssetIds();
}

function normalizeLoadedWorld(raw: World, includeGuestClaims: boolean): World {
  const landscapeType: LandscapeType = raw.landscapeType || 'village';
  const placedObjects: PlacedObject[] = Array.isArray(raw.placedObjects)
    ? raw.placedObjects
    : [];

  const defaultDecs = JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS)) as Record<
    LandscapeType,
    PlacedObject[]
  >;
  const mergedDecs: Record<LandscapeType, PlacedObject[]> = {
    village: Array.isArray(raw.landscapeDecorations?.village)
      ? raw.landscapeDecorations.village
      : defaultDecs.village,
    mountain: Array.isArray(raw.landscapeDecorations?.mountain)
      ? raw.landscapeDecorations.mountain
      : defaultDecs.mountain,
    river: Array.isArray(raw.landscapeDecorations?.river)
      ? raw.landscapeDecorations.river
      : defaultDecs.river,
    city: Array.isArray(raw.landscapeDecorations?.city)
      ? raw.landscapeDecorations.city
      : defaultDecs.city,
    wonderworld: Array.isArray(raw.landscapeDecorations?.wonderworld)
      ? raw.landscapeDecorations.wonderworld
      : [],
  };

  if (!raw.landscapeDecorations) {
    mergedDecs[landscapeType] = placedObjects;
  }

  const baseUnlocked = Array.isArray(raw.unlockedAssetIds)
    ? raw.unlockedAssetIds
    : [...DEFAULT_FREE_ASSET_IDS];
  const extraClaims = includeGuestClaims ? getGuestClaimedDailyGiftAssetIds() : [];
  const unlockedAssetIds = Array.from(
    new Set([...DEFAULT_FREE_ASSET_IDS, ...baseUnlocked, ...extraClaims])
  );

  return {
    ...raw,
    landscapeType,
    placedObjects,
    landscapeDecorations: mergedDecs,
    unlockedAssetIds,
    revision: typeof raw.revision === 'number' ? raw.revision : 0,
  };
}

function readGuestWorldFromStorage(): World | null {
  try {
    const rawGuest = localStorage.getItem(GUEST_STORAGE_KEY);
    if (rawGuest) {
      const parsed = JSON.parse(rawGuest) as World;
      if (parsed && Array.isArray(parsed.placedObjects)) {
        return normalizeLoadedWorld(parsed, true);
      }
    }

    // Non-destructive read fallback from legacy dev/test local storage key
    const rawLegacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy) as World;
      if (parsed && Array.isArray(parsed.placedObjects)) {
        return normalizeLoadedWorld(parsed, true);
      }
    }
  } catch (err) {
    console.error('Failed to parse guest local storage world:', err);
  }
  return null;
}

function writeGuestWorldToStorage(world: World): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(world));
  } catch {
    // ignore storage quota errors
  }
}

function readGoogleCloudCache(userId: string): World | null {
  try {
    const raw = localStorage.getItem(`${CLOUD_WORLD_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as World;
    if (parsed && Array.isArray(parsed.placedObjects)) {
      return normalizeLoadedWorld(parsed, false);
    }
  } catch {
    // ignore
  }
  return null;
}

function writeGoogleCloudCache(userId: string, world: World): void {
  try {
    localStorage.setItem(`${CLOUD_WORLD_CACHE_PREFIX}${userId}`, JSON.stringify(world));
  } catch {
    // ignore
  }
}

export function createDefaultWorld(landscapeType: LandscapeType = 'village', userId?: string): World {
  const now = new Date().toISOString();
  const decorations = JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
  const activeObjects = decorations[landscapeType] || decorations.village;

  const isGuest = !userId || userId === GUEST_ID;
  const claimedAssetIds = isGuest ? getGuestClaimedDailyGiftAssetIds() : [];
  const unlocked = Array.from(new Set([...DEFAULT_FREE_ASSET_IDS, ...claimedAssetIds]));

  return {
    id: 'world_' + Math.random().toString(36).substring(2, 9),
    ownerUserId: userId || GUEST_ID,
    name: 'My Christmas World',
    landscapeType,
    unlockedAssetIds: unlocked,
    placedObjects: activeObjects,
    landscapeDecorations: decorations,
    cameraState: {
      position: [0, 14, 26],
      target: [0, 1.5, 0],
    },
    settings: {
      timeOfDay: 'night',
      snowfallDensity: 'moderate',
      soundEnabled: true,
      bloomEnabled: true,
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
    revision: 0,
  };
}

/**
 * Prepares a clean initial cloud world for a Google user who does not yet have a row
 * in Supabase `user_worlds`. Ensures only server-authorized assets are included so
 * the initial save complies with strict backend validation without losing free decorations.
 */
export function sanitizeWorldForFirstCloudSave(
  sourceWorld: World,
  userId: string,
  isProUser: boolean,
  serverUnlockedAssetIds: string[] = []
): World {
  const authorizedIds = Array.from(
    new Set([...DEFAULT_FREE_ASSET_IDS, ...serverUnlockedAssetIds])
  );
  const { world: freeSafeWorld } = enforceFreeLandscapeAccess(sourceWorld, isProUser);

  const filterAuthorized = (objects: PlacedObject[]): PlacedObject[] =>
    (Array.isArray(objects) ? objects : []).filter((obj) =>
      isAssetUnlocked(obj.assetType, authorizedIds, isProUser)
    );

  const defaultDecs = JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS)) as Record<
    LandscapeType,
    PlacedObject[]
  >;
  const sourceDecs = freeSafeWorld.landscapeDecorations || defaultDecs;

  const sanitizedDecs: Record<LandscapeType, PlacedObject[]> = {
    village: filterAuthorized(sourceDecs.village || defaultDecs.village),
    mountain: filterAuthorized(sourceDecs.mountain || defaultDecs.mountain),
    river: filterAuthorized(sourceDecs.river || defaultDecs.river),
    city: filterAuthorized(sourceDecs.city || defaultDecs.city),
    wonderworld: isProUser ? filterAuthorized(sourceDecs.wonderworld || []) : [],
  };

  const sanitizedActive = filterAuthorized(
    freeSafeWorld.placedObjects || sanitizedDecs[freeSafeWorld.landscapeType] || []
  );
  sanitizedDecs[freeSafeWorld.landscapeType] = sanitizedActive;

  return {
    ...freeSafeWorld,
    ownerUserId: userId,
    placedObjects: sanitizedActive,
    landscapeDecorations: sanitizedDecs,
    unlockedAssetIds: authorizedIds,
    revision: 0,
  };
}

export async function loadGoogleCloudWorld(
  appUser: AppUser
): Promise<{ exists: boolean; world: World | null; networkError: boolean }> {
  const res = await loadWorldFromCloudBackendResult(appUser.id);
  if (res.ok && res.exists && res.world) {
    const normalized = normalizeLoadedWorld(res.world as World, false);
    writeGoogleCloudCache(appUser.id, normalized);
    return { exists: true, world: normalized, networkError: false };
  }

  if (res.ok && !res.exists) {
    return { exists: false, world: null, networkError: false };
  }

  const cached = readGoogleCloudCache(appUser.id);
  return {
    exists: Boolean(cached),
    world: cached,
    networkError: true,
  };
}

export async function saveWorld(
  world: World,
  _user: any | null,
  appUser?: AppUser | null
): Promise<CloudSaveResult> {
  try {
    const updatedWorld: World = {
      ...world,
      unlockedAssetIds: world.unlockedAssetIds || [...DEFAULT_FREE_ASSET_IDS],
      updatedAt: new Date().toISOString(),
    };

    // 1. Authenticated Google User -> Authoritative Supabase Cloud Backend
    if (appUser && appUser.provider === 'google') {
      const res = await saveWorldToCloudBackend(
        { ...updatedWorld, ownerUserId: appUser.id },
        appUser.id
      );

      if (res.success) {
        const syncedWorld: World = {
          ...updatedWorld,
          ownerUserId: appUser.id,
          revision: typeof res.revision === 'number' ? res.revision : updatedWorld.revision,
          updatedAt: res.updatedAt || updatedWorld.updatedAt,
          unlockedAssetIds: res.unlockedAssetIds || updatedWorld.unlockedAssetIds,
        };
        writeGoogleCloudCache(appUser.id, syncedWorld);
      } else if (res.conflict && res.serverWorld) {
        writeGoogleCloudCache(
          appUser.id,
          normalizeLoadedWorld(res.serverWorld as World, false)
        );
      }

      return res;
    }

    // 2. Guest Mode -> Isolated Guest localStorage
    writeGuestWorldToStorage(updatedWorld);
    return { success: true, mode: 'local' };
  } catch (err: any) {
    console.error('Save world error:', err);
    return {
      success: false,
      mode: appUser ? 'cloud' : 'local',
      error: err?.message || 'Unknown save error',
    };
  }
}

export async function loadWorld(
  _user: any | null,
  appUser?: AppUser | null
): Promise<World | null> {
  // 1. Authenticated Google User -> Load exclusively from Supabase cloud (never guest localStorage)
  if (appUser && appUser.provider === 'google') {
    const cloudRes = await loadGoogleCloudWorld(appUser);
    return cloudRes.world;
  }

  // 2. Guest Mode -> Isolated Guest localStorage
  return readGuestWorldFromStorage();
}
