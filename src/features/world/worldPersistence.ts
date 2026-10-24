import { World, LandscapeType, PlacedObject } from './worldTypes';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { GoogleUser, saveWorldToCloudBackend, loadWorldFromCloudBackend } from '../auth/googleAuthService';
import { DEFAULT_FREE_ASSET_IDS } from '../../game/assets/assetCatalog';

const LOCAL_STORAGE_KEY = 'mcw_saved_world_v1';
const GUEST_ID = 'guest-local-user';

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
};

export function getClaimedDailyGiftAssetIds(): string[] {
  try {
    const raw = localStorage.getItem('mcw_claimed_daily_gifts_v1');
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.map((item: any) => item.assetId).filter(Boolean);
    }
  } catch {
    // ignore
  }
  return [];
}

export function createDefaultWorld(landscapeType: LandscapeType = 'village', userId?: string): World {
  const now = new Date().toISOString();
  const decorations = JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
  const activeObjects = decorations[landscapeType] || decorations.village;

  const claimedAssetIds = getClaimedDailyGiftAssetIds();
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
  };
}

export async function saveWorld(
  world: World,
  user: User | null,
  googleUser?: GoogleUser | null
): Promise<{ success: boolean; mode: 'cloud' | 'local'; error?: string }> {
  try {
    const updatedWorld: World = {
      ...world,
      unlockedAssetIds: world.unlockedAssetIds || [...DEFAULT_FREE_ASSET_IDS],
      updatedAt: new Date().toISOString(),
    };

    // Always keep local storage updated as a fast cache / offline fallback
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedWorld));
    } catch {
      // ignore
    }

    // 1. Google Cloud Server Persistence
    if (googleUser) {
      const res = await saveWorldToCloudBackend(updatedWorld, googleUser.id);
      return res;
    }

    // 2. Supabase Cloud Persistence (if configured)
    if (isSupabaseConfigured && supabase && user) {
      const dbPayload = {
        owner_user_id: user.id,
        name: updatedWorld.name,
        landscape_type: updatedWorld.landscapeType,
        placed_objects: updatedWorld.placedObjects,
        camera_state: updatedWorld.cameraState,
        settings: {
          ...updatedWorld.settings,
          unlockedAssetIds: updatedWorld.unlockedAssetIds,
        },
        version: updatedWorld.version || 1,
        updated_at: updatedWorld.updatedAt,
      };

      const { data: existing } = await supabase
        .from('worlds')
        .select('id')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('worlds')
          .update(dbPayload)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('worlds').insert([
          {
            ...dbPayload,
            id: updatedWorld.id.startsWith('world_') ? undefined : updatedWorld.id,
          },
        ]);
        if (error) throw error;
      }

      return { success: true, mode: 'cloud' };
    }

    return { success: true, mode: 'local' };
  } catch (err: any) {
    console.error('Save world error:', err);
    return { success: false, mode: 'local', error: err.message || 'Unknown save error' };
  }
}

export async function loadWorld(
  user: User | null,
  googleUser?: GoogleUser | null
): Promise<World | null> {
  // 1. Try Google Cloud Server first if logged in
  if (googleUser) {
    try {
      const cloudWorld = await loadWorldFromCloudBackend(googleUser.id);
      if (cloudWorld && Array.isArray(cloudWorld.placedObjects)) {
        const claimed = getClaimedDailyGiftAssetIds();
        const baseUnlocked = cloudWorld.unlockedAssetIds || [...DEFAULT_FREE_ASSET_IDS];
        cloudWorld.unlockedAssetIds = Array.from(new Set([...baseUnlocked, ...claimed]));

        if (!cloudWorld.landscapeDecorations) {
          const decs = JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
          decs[cloudWorld.landscapeType] = cloudWorld.placedObjects;
          cloudWorld.landscapeDecorations = decs;
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudWorld));
        return cloudWorld;
      }
    } catch (err) {
      console.warn('Could not load from Google Cloud server:', err);
    }
  }

  // 2. Try Supabase Cloud
  if (isSupabaseConfigured && supabase && user) {
    try {
      const { data, error } = await supabase
        .from('worlds')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const cloudDecorations = data.settings?.landscapeDecorations || (() => {
          const decs = JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
          decs[data.landscape_type as LandscapeType] = data.placed_objects || [];
          return decs;
        })();

        const claimed = getClaimedDailyGiftAssetIds();
        const baseUnlocked = data.settings?.unlockedAssetIds || [...DEFAULT_FREE_ASSET_IDS];
        const unlocked = Array.from(new Set([...baseUnlocked, ...claimed]));

        const cloudWorld: World = {
          id: data.id,
          ownerUserId: data.owner_user_id,
          name: data.name,
          landscapeType: data.landscape_type as LandscapeType,
          placedObjects: data.placed_objects || [],
          landscapeDecorations: cloudDecorations,
          unlockedAssetIds: unlocked,
          cameraState: data.camera_state,
          settings: data.settings || {
            timeOfDay: 'night',
            snowfallDensity: 'moderate',
            soundEnabled: true,
            bloomEnabled: true,
          },
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          version: data.version || 1,
        };

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudWorld));
        return cloudWorld;
      }
    } catch (err) {
      console.warn('Could not load from Supabase cloud:', err);
    }
  }

  // 3. Fall back to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as World;
      if (parsed && Array.isArray(parsed.placedObjects)) {
        const claimed = getClaimedDailyGiftAssetIds();
        const baseUnlocked = parsed.unlockedAssetIds || [...DEFAULT_FREE_ASSET_IDS];
        parsed.unlockedAssetIds = Array.from(new Set([...baseUnlocked, ...claimed]));

        if (!parsed.landscapeDecorations) {
          const decs = JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
          decs[parsed.landscapeType] = parsed.placedObjects;
          parsed.landscapeDecorations = decs;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse local storage world:', err);
  }

  return null;
}
