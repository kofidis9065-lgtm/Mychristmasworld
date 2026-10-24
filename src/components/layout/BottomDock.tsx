import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Compass,
  Move,
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Camera,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { ASSET_CATALOG, isAssetUnlocked } from '../../game/assets/assetCatalog';
import { PlacedObject, LandscapeType } from '../../features/world/worldTypes';
import { soundEngine } from '../../lib/audioSynthesis';

interface Props {
  selectedObject: PlacedObject | null;
  activePlacementAsset: string | null;
  isMovingSelected: boolean;
  currentLandscape: LandscapeType;
  unlockedAssetIds?: string[];
  landscapeDecorations?: Record<LandscapeType, PlacedObject[]>;
  onSelectPlacementAsset: (assetId: string | null) => void;
  onConfirmPlacementAtCenter?: () => void;
  onCancelPlacement: () => void;
  onToggleMoveSelected: () => void;
  onNudgeSelected?: (dx: number, dz: number) => void;
  onDeselect?: () => void;
  onRotateSelected: (deltaRad: number) => void;
  onScaleSelected: (scaleFactor: number) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onSwitchLandscape: (landscape: LandscapeType) => void;
  onSetCameraAngle: (angle: 'overview' | 'close' | 'top') => void;
  onOpenGifts: () => void;
}

export const BottomDock: React.FC<Props> = ({
  selectedObject,
  activePlacementAsset,
  isMovingSelected,
  currentLandscape,
  unlockedAssetIds,
  landscapeDecorations,
  onSelectPlacementAsset,
  onConfirmPlacementAtCenter,
  onCancelPlacement,
  onToggleMoveSelected,
  onNudgeSelected,
  onDeselect,
  onRotateSelected,
  onScaleSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onSwitchLandscape,
  onSetCameraAngle,
  onOpenGifts,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'landscapes' | 'camera'>('catalog');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'nature' | 'structures' | 'festive' | 'secrets'>('all');

  const filteredAssets = ASSET_CATALOG.filter((a) => {
    if (catalogFilter === 'secrets') return a.isSecretGift;
    if (catalogFilter === 'all') return true;
    return a.category === catalogFilter;
  }).sort((a, b) => {
    const aUnlocked = isAssetUnlocked(a.id, unlockedAssetIds);
    const bUnlocked = isAssetUnlocked(b.id, unlockedAssetIds);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return 0;
  });

  return (
    <aside
      aria-label="World building controls"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-2 sm:px-3 pointer-events-none transition-all duration-300 select-none"
    >
      <div className="flex flex-col items-center">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            setIsCollapsed(!isCollapsed);
          }}
          className="pointer-events-auto mb-1 py-1 px-4 rounded-t-xl winter-panel text-[11px] font-semibold text-[#edf2f6] hover:text-[#e5c783] flex items-center gap-1.5 shadow-md cursor-pointer border-b-0"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#e5c783]" />
              <span>Show Builder Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#e5c783]" />
              <span>Cinema Mode (Hide HUD)</span>
            </>
          )}
        </button>

        {/* Main Dock Container */}
        {!isCollapsed && (
          <div className="pointer-events-auto w-full rounded-2xl winter-panel p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-none border-[#e5c783]/30">
            {/* If an object is actively selected OR user is in move mode, show the Selected Object Inspector */}
            {selectedObject ? (
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg festive-gradient text-xs">
                      ✨
                    </span>
                    <div>
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider font-serif-display">
                        {selectedObject.name}
                      </h2>
                      <span className="text-[10px] text-[#91a1b1]">
                        Position: [{selectedObject.position[0].toFixed(1)}, {selectedObject.position[2].toFixed(1)}]
                      </span>
                    </div>
                  </div>

                  {/* Move mode prompt banner */}
                  <div className="flex items-center gap-2">
                    {isMovingSelected ? (
                      <span className="text-[11px] text-amber-200 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 animate-pulse font-medium">
                        📍 Tap ground or use arrows below
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#91a1b1] hidden sm:inline">
                        Selected
                      </span>
                    )}
                    {onDeselect && (
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onDeselect();
                        }}
                        className="p-1 text-[#91a1b1] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                        title="Deselect object"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Object Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                    {/* Move Button with festive-gradient when active */}
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onToggleMoveSelected();
                      }}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isMovingSelected
                          ? 'festive-gradient'
                          : 'bg-white/10 hover:bg-white/15 text-white'
                      }`}
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>{isMovingSelected ? 'Done Move' : 'Move'}</span>
                    </button>

                    {/* Precise Nudge Arrow Buttons (Solves all move issues!) */}
                    {onNudgeSelected && (
                      <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white/5 border border-white/10">
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            onNudgeSelected(-1, 0);
                          }}
                          title="Move Left (-X)"
                          className="p-1 rounded-lg hover:bg-white/20 text-[#edf2f6] cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            onNudgeSelected(0, -1);
                          }}
                          title="Move North (-Z)"
                          className="p-1 rounded-lg hover:bg-white/20 text-[#edf2f6] cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            onNudgeSelected(0, 1);
                          }}
                          title="Move South (+Z)"
                          className="p-1 rounded-lg hover:bg-white/20 text-[#edf2f6] cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            onNudgeSelected(1, 0);
                          }}
                          title="Move Right (+X)"
                          className="p-1 rounded-lg hover:bg-white/20 text-[#edf2f6] cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Rotate Controls */}
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onRotateSelected(-Math.PI / 4);
                      }}
                      title="Rotate Left (-45°)"
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onRotateSelected(Math.PI / 4);
                      }}
                      title="Rotate Right (+45°)"
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Scale Controls: visible on mobile & tablet */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 text-[11px] text-[#91a1b1]">
                      <span className="hidden xs:inline">Size:</span>
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onScaleSelected(0.9);
                        }}
                        title="Shrink (-10%)"
                        className="w-5 h-5 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 active:scale-95 cursor-pointer font-bold"
                      >
                        -
                      </button>
                      <span className="text-amber-200 font-mono text-[10px] px-0.5">
                        {selectedObject.scale[0].toFixed(1)}x
                      </span>
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onScaleSelected(1.1);
                        }}
                        title="Enlarge (+10%)"
                        className="w-5 h-5 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 active:scale-95 cursor-pointer font-bold"
                      >
                        +
                      </button>
                    </div>

                    {/* Duplicate */}
                    <button
                      onClick={() => {
                        soundEngine.playPlacement();
                        onDuplicateSelected();
                      }}
                      title="Duplicate Object"
                      className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      soundEngine.playDelete();
                      onDeleteSelected();
                    }}
                    className="py-1.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Active Placement Banner */}
                {activePlacementAsset && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 mb-2.5 text-xs text-amber-200 shadow-lg">
                    <span className="flex items-center gap-2 font-medium">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>Tap anywhere on ground or click Place:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          soundEngine.playPlacement();
                          if (onConfirmPlacementAtCenter) {
                            onConfirmPlacementAtCenter();
                          }
                        }}
                        className="px-3 py-1 rounded-lg festive-gradient font-bold text-xs flex items-center gap-1 shadow cursor-pointer active:scale-95"
                      >
                        <span>Place at Center ✨</span>
                      </button>
                      <button
                        onClick={onCancelPlacement}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dock Tabs Header */}
                <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab('catalog');
                      }}
                      className={`py-1 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'catalog'
                          ? 'festive-gradient'
                          : 'text-[#91a1b1] hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Decorate</span>
                    </button>

                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab('landscapes');
                      }}
                      className={`py-1 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'landscapes'
                          ? 'festive-gradient'
                          : 'text-[#91a1b1] hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Landscapes</span>
                    </button>

                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab('camera');
                      }}
                      className={`py-1 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'camera'
                          ? 'festive-gradient'
                          : 'text-[#91a1b1] hover:text-white'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                  </div>

                  {/* Filter Pills if Catalog is active */}
                  {activeTab === 'catalog' && (
                    <div className="flex items-center gap-1 text-[11px] overflow-x-auto scrollbar-none">
                      {(['all', 'nature', 'structures', 'festive', 'secrets'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            soundEngine.playClick();
                            setCatalogFilter(filter);
                          }}
                          className={`px-2 py-0.5 rounded-lg capitalize whitespace-nowrap transition-all cursor-pointer ${
                            catalogFilter === filter
                              ? 'festive-gradient text-[10px]'
                              : 'text-[#91a1b1] hover:text-white'
                          }`}
                        >
                          {filter === 'secrets' ? '🎁 Secret Gifts' : filter}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tab Content 1: Catalog Shelf */}
                {activeTab === 'catalog' && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none touch-pan-x">
                    {filteredAssets.map((asset) => {
                      const isUnlocked = isAssetUnlocked(asset.id, unlockedAssetIds);
                      const isActive = activePlacementAsset === asset.id;

                      if (!isUnlocked) {
                        return (
                          <button
                            key={asset.id}
                            onClick={() => {
                              soundEngine.playClick();
                              onOpenGifts();
                            }}
                            title="Secret Gift: Claim in Daily Gifts to unlock for your library!"
                            className="relative shrink-0 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer min-w-[74px] bg-[#0d1723]/90 border border-amber-500/30 hover:border-amber-400/60 hover:bg-[#132131] active:scale-95 group"
                          >
                            <span className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-amber-300">
                              <Lock className="w-2.5 h-2.5" />
                            </span>
                            <span className="text-2xl mb-1 filter drop-shadow opacity-75 group-hover:scale-110 transition-transform">
                              🎁
                            </span>
                            <span className="text-[10px] text-amber-200/90 text-center line-clamp-1 max-w-[68px] font-medium">
                              Secret Gift
                            </span>
                            <span className="text-[8px] text-[#91a1b1] uppercase font-mono">
                              Unlock ➔
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={asset.id}
                          onClick={() => {
                            soundEngine.playClick();
                            if (isActive) {
                              onCancelPlacement();
                            } else {
                              onSelectPlacementAsset(asset.id);
                            }
                          }}
                          className={`relative shrink-0 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer min-w-[74px] ${
                            isActive
                              ? 'festive-gradient scale-105'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          {asset.isSecretGift && (
                            <span className="absolute -top-1 -right-1 text-[9px] px-1 rounded-full bg-amber-400 text-black font-bold shadow">
                              ★
                            </span>
                          )}
                          <span className="text-2xl mb-1 filter drop-shadow">
                            {asset.previewIcon}
                          </span>
                          <span className="text-[10px] text-center line-clamp-1 max-w-[68px]">
                            {asset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab Content 2: Independent Landscapes (Request 6) */}
                {activeTab === 'landscapes' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                    {[
                      { id: 'village', label: 'Classic Village', icon: '🏡', desc: 'Cozy log chalets & paths' },
                      { id: 'mountain', label: 'Alpine Mountain', icon: '🏔️', desc: 'Rugged peaks & pine shelves' },
                      { id: 'river', label: 'Frozen River', icon: '❄️', desc: 'Glacial ice & timber bridge' },
                      { id: 'city', label: 'Christmas City', icon: '🏙️', desc: 'Skyscrapers & lighted avenue' },
                    ].map((land) => {
                      const isCur = currentLandscape === land.id;
                      const itemCount = landscapeDecorations?.[land.id as LandscapeType]?.length ?? 0;

                      return (
                        <button
                          key={land.id}
                          onClick={() => {
                            soundEngine.playPlacement();
                            onSwitchLandscape(land.id as LandscapeType);
                          }}
                          className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                            isCur
                              ? 'festive-gradient'
                              : 'bg-white/5 border-transparent hover:bg-white/10 text-[#91a1b1]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xl">{land.icon}</span>
                              <span className="text-xs font-bold text-white font-serif-display">
                                {land.label}
                              </span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono text-amber-200">
                              {itemCount} items
                            </span>
                          </div>
                          <span className="text-[10px] text-white/80 line-clamp-1">
                            {land.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab Content 3: Camera Presets */}
                {activeTab === 'camera' && (
                  <div className="flex items-center justify-around gap-2 py-1">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onSetCameraAngle('overview');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 text-[#e5c783]" />
                      <span>Cinematic Overview</span>
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onSetCameraAngle('close');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Close Details</span>
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onSetCameraAngle('top');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Top Diorama</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
