export type LandscapeType = 'village' | 'mountain' | 'river' | 'city' | 'wonderworld';
export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface PlacedObjectPayload {
  id: string;
  assetType: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  colorVariant?: string;
  createdAt: string;
}

export interface CameraStatePayload {
  position: [number, number, number];
  target: [number, number, number];
}

export interface WorldSettingsPayload {
  timeOfDay: TimeOfDay;
  snowfallDensity: 'off' | 'light' | 'moderate' | 'heavy';
  soundEnabled: boolean;
  bloomEnabled: boolean;
}

export interface StoredWorldRecord {
  id: string;
  ownerUserId: string;
  name: string;
  landscapeType: LandscapeType;
  placedObjects: PlacedObjectPayload[];
  landscapeDecorations: Record<LandscapeType, PlacedObjectPayload[]>;
  unlockedAssetIds: string[];
  cameraState: CameraStatePayload | null;
  settings: WorldSettingsPayload;
  version: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export const VALID_LANDSCAPE_TYPES: readonly LandscapeType[] = [
  'village',
  'mountain',
  'river',
  'city',
  'wonderworld',
];

export const FREE_DAILY_GIFT_LIMIT = 3;

export const STARTER_FREE_ASSET_IDS = new Set<string>([
  'christmas_tree',
  'christmas_house',
  'street_lamp',
  'gift_box',
  'snowman',
  'christmas_train',
  'park_bench',
]);

// Canonical 22 Secret Daily Gift IDs from src/game/assets/assetCatalog.ts
export const SECRET_GIFT_ASSET_IDS = new Set<string>([
  'reindeer',
  'sleigh',
  'market_stall',
  'candy_cane_arch',
  'gingerbread_house',
  'nutcracker',
  'crystal_tree',
  'carousel',
  'snowglobe',
  'north_pole_sign',
  'fireplace',
  'giant_wreath',
  'peppermint_tower',
  'polar_bear',
  'bell_tower',
  'gift_pyramid',
  'ice_swan',
  'illuminated_arch',
  'log_campfire',
  'toy_soldier',
  'santa_mailbox',
  'golden_angel',
]);

// Canonical 30 Christmas Pro exclusive asset IDs from src/game/assets/assetCatalog.ts
export const PREMIUM_ASSET_IDS = new Set<string>([
  'pro_ferris_wheel',
  'pro_roller_coaster',
  'pro_grand_carousel',
  'pro_express_train',
  'pro_bumper_cars',
  'pro_swing_ride',
  'pro_hot_air_balloon',
  'pro_skating_couple',
  'pro_gingerbread_funhouse',
  'pro_churros_cocoa_stand',
  'pro_carnival_game_booth',
  'pro_clock_tower',
  'pro_fireworks_launcher',
  'pro_laser_projector',
  'pro_snow_globe_dome',
  'pro_brass_band',
  'pro_reindeer_carousel',
  'pro_ice_slide_sled',
  'pro_circus_tent',
  'pro_popcorn_wagon',
  'pro_star_arch',
  'pro_toy_soldier_parade',
  'pro_snowman_juggler',
  'pro_light_tunnel',
  'pro_animated_fountain',
  'pro_waffle_hut',
  'pro_tree_ride',
  'pro_swan_boat',
  'pro_marshmallow_fire',
  'pro_ferris_entrance',
]);

export const ALL_KNOWN_ASSET_IDS = new Set<string>([
  ...STARTER_FREE_ASSET_IDS,
  ...SECRET_GIFT_ASSET_IDS,
  ...PREMIUM_ASSET_IDS,
]);

export function isEligibleSecretGiftAsset(assetId: string): boolean {
  const clean = String(assetId || '').trim();
  return SECRET_GIFT_ASSET_IDS.has(clean) && !PREMIUM_ASSET_IDS.has(clean);
}

export function getUtcTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function isFiniteTriple(val: unknown): val is [number, number, number] {
  return (
    Array.isArray(val) &&
    val.length === 3 &&
    typeof val[0] === 'number' &&
    Number.isFinite(val[0]) &&
    typeof val[1] === 'number' &&
    Number.isFinite(val[1]) &&
    typeof val[2] === 'number' &&
    Number.isFinite(val[2])
  );
}

function parsePlacedObject(raw: any): PlacedObjectPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const assetType = typeof raw.assetType === 'string' ? raw.assetType.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : assetType;

  if (!id || id.length > 128 || !assetType || assetType.length > 64) {
    return null;
  }

  if (!isFiniteTriple(raw.position) || !isFiniteTriple(raw.rotation) || !isFiniteTriple(raw.scale)) {
    return null;
  }

  const createdAt =
    typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
      ? raw.createdAt
      : new Date().toISOString();

  const sanitized: PlacedObjectPayload = {
    id,
    assetType,
    name: name.slice(0, 120) || assetType,
    position: [raw.position[0], raw.position[1], raw.position[2]],
    rotation: [raw.rotation[0], raw.rotation[1], raw.rotation[2]],
    scale: [raw.scale[0], raw.scale[1], raw.scale[2]],
    createdAt,
  };

  if (typeof raw.colorVariant === 'string' && raw.colorVariant.trim()) {
    sanitized.colorVariant = raw.colorVariant.trim().slice(0, 64);
  }

  return sanitized;
}

const MAX_OBJECTS_PER_LANDSCAPE = 1500;

export interface SanitizedWorldSaveInput {
  worldId: string;
  name: string;
  landscapeType: LandscapeType;
  placedObjects: PlacedObjectPayload[];
  landscapeDecorations: Record<LandscapeType, PlacedObjectPayload[]>;
  cameraState: CameraStatePayload | null;
  settings: WorldSettingsPayload;
  schemaVersion: number;
  expectedRevision: number | null;
  clientUpdatedAt: string | null;
}

export function validateAndSanitizeWorldSave(params: {
  rawBody: any;
  userId: string;
  existingWorld: StoredWorldRecord | null;
  serverUnlockedAssetIds: Set<string>;
  isPro: boolean;
}):
  | { ok: true; data: SanitizedWorldSaveInput }
  | { ok: false; status: number; error: string } {
  const { rawBody, userId, existingWorld, serverUnlockedAssetIds, isPro } = params;

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return { ok: false, status: 400, error: 'World payload must be a JSON object.' };
  }

  const landscapeType = String(rawBody.landscapeType || 'village').trim() as LandscapeType;
  if (!VALID_LANDSCAPE_TYPES.includes(landscapeType)) {
    return { ok: false, status: 400, error: 'Invalid landscapeType.' };
  }

  if (!isPro && landscapeType === 'wonderworld') {
    return {
      ok: false,
      status: 403,
      error: 'Christmas Pro is required to switch to or save active Wonderworld mode.',
    };
  }

  if (!Array.isArray(rawBody.placedObjects)) {
    return { ok: false, status: 400, error: 'placedObjects must be an array.' };
  }

  if (rawBody.placedObjects.length > MAX_OBJECTS_PER_LANDSCAPE) {
    return { ok: false, status: 400, error: 'Too many objects in active landscape.' };
  }

  // Track previously persisted objects per landscape so existing/refunded data is preserved cleanly
  const existingIdsByLandscape = new Map<LandscapeType, Map<string, string>>();
  for (const land of VALID_LANDSCAPE_TYPES) {
    const map = new Map<string, string>();
    const existingList = existingWorld?.landscapeDecorations?.[land] || [];
    for (const obj of existingList) {
      if (obj?.id && obj?.assetType) {
        map.set(obj.id, obj.assetType);
      }
    }
    if (existingWorld?.landscapeType === land) {
      for (const obj of existingWorld.placedObjects || []) {
        if (obj?.id && obj?.assetType) {
          map.set(obj.id, obj.assetType);
        }
      }
    }
    existingIdsByLandscape.set(land, map);
  }

  const validateObjectList = (
    rawList: unknown[],
    landscape: LandscapeType
  ): { ok: true; objects: PlacedObjectPayload[] } | { ok: false; status: number; error: string } => {
    if (rawList.length > MAX_OBJECTS_PER_LANDSCAPE) {
      return { ok: false, status: 400, error: `Too many objects in landscape "${landscape}".` };
    }

    const existingMap = existingIdsByLandscape.get(landscape) || new Map<string, string>();
    const parsedList: PlacedObjectPayload[] = [];

    for (const item of rawList) {
      const parsed = parsePlacedObject(item);
      if (!parsed) {
        return { ok: false, status: 400, error: 'Invalid placed object structure or transform.' };
      }

      const wasPreviouslySaved = existingMap.get(parsed.id) === parsed.assetType;

      if (!ALL_KNOWN_ASSET_IDS.has(parsed.assetType) && !wasPreviouslySaved) {
        return {
          ok: false,
          status: 400,
          error: `Unknown assetType "${parsed.assetType}" is not in the catalog.`,
        };
      }

      if (!isPro && !wasPreviouslySaved) {
        if (PREMIUM_ASSET_IDS.has(parsed.assetType)) {
          return {
            ok: false,
            status: 403,
            error: `Christmas Pro is required to place premium asset "${parsed.assetType}".`,
          };
        }

        if (
          SECRET_GIFT_ASSET_IDS.has(parsed.assetType) &&
          !serverUnlockedAssetIds.has(parsed.assetType)
        ) {
          return {
            ok: false,
            status: 403,
            error: `Secret Gift "${parsed.assetType}" has not been unlocked on this account.`,
          };
        }
      }

      parsedList.push(parsed);
    }

    return { ok: true, objects: parsedList };
  };

  const activeValidated = validateObjectList(rawBody.placedObjects, landscapeType);
  if (activeValidated.ok === false) {
    return activeValidated;
  }

  const rawDecorations =
    rawBody.landscapeDecorations &&
    typeof rawBody.landscapeDecorations === 'object' &&
    !Array.isArray(rawBody.landscapeDecorations)
      ? rawBody.landscapeDecorations
      : {};

  const sanitizedDecorations: Record<LandscapeType, PlacedObjectPayload[]> = {
    village: existingWorld?.landscapeDecorations?.village || [],
    mountain: existingWorld?.landscapeDecorations?.mountain || [],
    river: existingWorld?.landscapeDecorations?.river || [],
    city: existingWorld?.landscapeDecorations?.city || [],
    wonderworld: existingWorld?.landscapeDecorations?.wonderworld || [],
  };

  for (const land of VALID_LANDSCAPE_TYPES) {
    if (land === landscapeType) {
      sanitizedDecorations[land] = activeValidated.objects;
      continue;
    }

    if (land === 'wonderworld' && !isPro) {
      // Non-destructive preservation: Free users cannot modify stored Wonderworld decorations
      sanitizedDecorations.wonderworld = existingWorld?.landscapeDecorations?.wonderworld || [];
      continue;
    }

    if (Array.isArray(rawDecorations[land])) {
      const landValidated = validateObjectList(rawDecorations[land], land);
      if (landValidated.ok === false) {
        return landValidated;
      }
      sanitizedDecorations[land] = landValidated.objects;
    }
  }

  let cameraState: CameraStatePayload | null = null;
  if (rawBody.cameraState !== undefined && rawBody.cameraState !== null) {
    const cam = rawBody.cameraState;
    if (
      typeof cam !== 'object' ||
      Array.isArray(cam) ||
      !isFiniteTriple(cam.position) ||
      !isFiniteTriple(cam.target)
    ) {
      return { ok: false, status: 400, error: 'Invalid cameraState format.' };
    }
    cameraState = {
      position: [cam.position[0], cam.position[1], cam.position[2]],
      target: [cam.target[0], cam.target[1], cam.target[2]],
    };
  }

  const rawSettings =
    rawBody.settings && typeof rawBody.settings === 'object' && !Array.isArray(rawBody.settings)
      ? rawBody.settings
      : {};

  const timeOfDay: TimeOfDay =
    rawSettings.timeOfDay === 'day' ||
    rawSettings.timeOfDay === 'sunset' ||
    rawSettings.timeOfDay === 'night'
      ? rawSettings.timeOfDay
      : 'night';

  const snowfallDensity: WorldSettingsPayload['snowfallDensity'] =
    rawSettings.snowfallDensity === 'off' ||
    rawSettings.snowfallDensity === 'light' ||
    rawSettings.snowfallDensity === 'moderate' ||
    rawSettings.snowfallDensity === 'heavy'
      ? rawSettings.snowfallDensity
      : 'moderate';

  const settings: WorldSettingsPayload = {
    timeOfDay,
    snowfallDensity,
    soundEnabled: typeof rawSettings.soundEnabled === 'boolean' ? rawSettings.soundEnabled : true,
    bloomEnabled: typeof rawSettings.bloomEnabled === 'boolean' ? rawSettings.bloomEnabled : true,
  };

  const rawWorldId = typeof rawBody.id === 'string' ? rawBody.id.trim() : '';
  const worldId =
    rawWorldId && rawWorldId.length <= 128 ? rawWorldId : `world_${userId}`;

  const rawName = typeof rawBody.name === 'string' ? rawBody.name.trim() : '';
  const name = rawName ? rawName.slice(0, 120) : 'My Christmas World';

  const rawSchemaVersion = Number(rawBody.version);
  const schemaVersion =
    Number.isInteger(rawSchemaVersion) && rawSchemaVersion >= 1 ? rawSchemaVersion : 1;

  let expectedRevision: number | null = null;
  if (rawBody.revision !== undefined && rawBody.revision !== null) {
    const parsedRev = Number(rawBody.revision);
    if (!Number.isInteger(parsedRev) || parsedRev < 0) {
      return { ok: false, status: 400, error: 'Invalid revision number.' };
    }
    expectedRevision = parsedRev;
  } else if (!existingWorld) {
    expectedRevision = 0;
  }

  const clientUpdatedAt =
    typeof rawBody.updatedAt === 'string' && !Number.isNaN(Date.parse(rawBody.updatedAt))
      ? new Date(rawBody.updatedAt).toISOString()
      : new Date().toISOString();

  return {
    ok: true,
    data: {
      worldId,
      name,
      landscapeType,
      placedObjects: activeValidated.objects,
      landscapeDecorations: sanitizedDecorations,
      cameraState,
      settings,
      schemaVersion,
      expectedRevision,
      clientUpdatedAt,
    },
  };
}
