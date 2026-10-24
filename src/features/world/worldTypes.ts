export type LandscapeType = 'village' | 'mountain' | 'river' | 'city';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type AssetCategory = 'structures' | 'nature' | 'decorations' | 'festive';

export interface PlacedObject {
  id: string;
  assetType: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number]; // [x, y, z] in radians
  scale: [number, number, number];
  colorVariant?: string;
  createdAt: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface WorldSettings {
  timeOfDay: TimeOfDay;
  snowfallDensity: 'off' | 'light' | 'moderate' | 'heavy';
  soundEnabled: boolean;
  bloomEnabled: boolean;
}

export interface World {
  id: string;
  ownerUserId: string;
  name: string;
  landscapeType: LandscapeType;
  placedObjects: PlacedObject[];
  landscapeDecorations?: Record<LandscapeType, PlacedObject[]>; // Independent decorations per landscape field!
  unlockedAssetIds?: string[]; // Assets unlocked in the library via Daily Gifts
  cameraState?: CameraState;
  settings: WorldSettings;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  description: string;
  previewIcon: string;
  defaultScale: [number, number, number];
  isDailyReward?: boolean;
  isSecretGift?: boolean; // Secret gift unlocked exclusively through Daily Gifts
  unlockDay?: number;
}
