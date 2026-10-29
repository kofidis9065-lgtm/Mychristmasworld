import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorldCanvas, WorldCanvasHandle } from './game/WorldCanvas';
import { TopBar } from './components/layout/TopBar';
import { BottomDock } from './components/layout/BottomDock';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { GiftModal } from './features/gifts/GiftModal';
import { ImageExportModal } from './features/export/ImageExportModal';
import { AuthModal } from './features/auth/AuthModal';
import { World, LandscapeType, PlacedObject, TimeOfDay } from './features/world/worldTypes';
import { createDefaultWorld, saveWorld, loadWorld, DEFAULT_LANDSCAPE_DECORATIONS } from './features/world/worldPersistence';
import { checkDailyGiftClaimed } from './features/gifts/giftService';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { soundEngine } from './lib/audioSynthesis';
import { youtubeAudio } from './lib/youtubePlayerService';
import { User } from '@supabase/supabase-js';
import { AppUser, getStoredUser } from './features/auth/userAuthService';

export function App() {
  const [world, setWorld] = useState<World>(() => createDefaultWorld('village'));
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredUser());
  const [hasExistingSavedWorld, setHasExistingSavedWorld] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  // Interaction State
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [placementAssetType, setPlacementAssetType] = useState<string | null>(null);
  const [isMovingSelected, setIsMovingSelected] = useState<boolean>(false);

  // Persistence State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [saveMode, setSaveMode] = useState<'cloud' | 'local'>('local');
  const [dailyGiftAvailable, setDailyGiftAvailable] = useState<boolean>(true);

  // Modals
  const [isGiftModalOpen, setIsGiftModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [santaToast, setSantaToast] = useState<{
    title: string;
    subtitle: string;
    type: 'sky' | 'ground';
  } | null>(null);

  const canvasRef = useRef<WorldCanvasHandle | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // 1. Initialize Auth and Load Existing World
  useEffect(() => {
    const init = async () => {
      let currentUser: User | null = null;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          currentUser = data.session?.user || null;
          if (currentUser?.email && currentUser.email.toLowerCase().includes('kofidis')) {
            try {
              await supabase.auth.signOut();
            } catch {
              // ignore
            }
            currentUser = null;
          }
          setUser(currentUser);

          supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user || null;
            if (u?.email && u.email.toLowerCase().includes('kofidis')) {
              setUser(null);
            } else {
              setUser(u);
            }
          });
        } catch (err) {
          console.warn('Supabase session check error:', err);
        }
      }

      // Check if world exists in cloud or local cache
      const storedAppUser = getStoredUser();
      const saved = await loadWorld(currentUser, storedAppUser);
      if (saved) {
        setWorld(saved);
        setHasExistingSavedWorld(true);
        if (storedAppUser) {
          setSaveMode('cloud');
        }
      }

      // Check daily gift status
      const claimed = await checkDailyGiftClaimed(currentUser, 0, storedAppUser?.id);
      setDailyGiftAvailable(!claimed);
    };

    init();
  }, []);

  // Update daily gift check when user changes
  useEffect(() => {
    checkDailyGiftClaimed(user, 0, currentUser?.id).then((claimed) => {
      setDailyGiftAvailable(!claimed);
    });
  }, [user, currentUser]);

  // Autoplay vintage Christmas music on first user gesture
  useEffect(() => {
    const startAudioOnGesture = () => {
      const state = youtubeAudio.getState();
      if (!state.isMuted && !state.isPlaying) {
        youtubeAudio.play();
      }
      window.removeEventListener('pointerdown', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
      window.removeEventListener('touchstart', startAudioOnGesture);
    };

    window.addEventListener('pointerdown', startAudioOnGesture, { once: true });
    window.addEventListener('keydown', startAudioOnGesture, { once: true });
    window.addEventListener('touchstart', startAudioOnGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
      window.removeEventListener('touchstart', startAudioOnGesture);
    };
  }, []);

  // 2. Debounced Auto-Save
  const triggerAutoSave = useCallback((worldToSave: World) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      const res = await saveWorld(worldToSave, user, currentUser);
      if (res.success) {
        setSaveStatus('saved');
        setSaveMode(res.mode);
      } else {
        setSaveStatus('error');
      }
    }, 700);
  }, [user, currentUser]);

  // Handle Welcome Screen actions
  const handleContinueExisting = () => {
    setShowWelcome(false);
    youtubeAudio.play();
    soundEngine.playWinterBreeze();
  };

  const handleCreateNewWorld = (landscape: LandscapeType) => {
    const newWorld = createDefaultWorld(landscape, currentUser?.id || user?.id);
    setWorld(newWorld);
    setShowWelcome(false);
    youtubeAudio.play();
    triggerAutoSave(newWorld);
    soundEngine.playWinterBreeze();
  };

  // Helper: Synchronize placedObjects with independent landscapeDecorations
  const updateWorldObjects = useCallback(
    (updater: (currentObjects: PlacedObject[], currentWorld: World) => PlacedObject[]) => {
      setWorld((prevWorld) => {
        const currentObjects = prevWorld.placedObjects || [];
        const newObjects = updater(currentObjects, prevWorld);
        const decs = prevWorld.landscapeDecorations || JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
        const updatedDecorations = {
          ...decs,
          [prevWorld.landscapeType]: newObjects,
        };

        const updatedWorld: World = {
          ...prevWorld,
          placedObjects: newObjects,
          landscapeDecorations: updatedDecorations,
        };

        triggerAutoSave(updatedWorld);
        return updatedWorld;
      });
    },
    [triggerAutoSave]
  );

  // 3. Object Manipulation Actions (Each landscape is saved independently!)
  const handlePlaceObjectAt = (position: [number, number, number], assetTypeOverride?: string) => {
    const assetToPlace = assetTypeOverride || placementAssetType;
    if (!assetToPlace) return;

    const newObj: PlacedObject = {
      id: 'obj_' + Math.random().toString(36).substring(2, 9),
      assetType: assetToPlace,
      name: assetToPlace.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      position,
      rotation: [0, (Math.floor(Math.random() * 8) * Math.PI) / 4, 0],
      scale: [1, 1, 1],
      createdAt: new Date().toISOString(),
    };

    updateWorldObjects((currentObjects) => [...currentObjects, newObj]);
    setSelectedObjectId(newObj.id);
    setPlacementAssetType(null); // finish single placement
  };

  const handleSelectObject = (id: string | null) => {
    setSelectedObjectId(id);
    setIsMovingSelected(false);
  };

  const handleMoveObjectTo = (id: string, position: [number, number, number]) => {
    updateWorldObjects((currentObjects) =>
      currentObjects.map((obj) => (obj.id === id ? { ...obj, position } : obj))
    );
    setIsMovingSelected(false);
  };

  const handleNudgeSelected = (dx: number, dz: number) => {
    if (!selectedObjectId) return;
    setWorld((prevWorld) => {
      const target = (prevWorld.placedObjects || []).find((o) => o.id === selectedObjectId);
      if (!target) return prevWorld;

      const newPos: [number, number, number] = [
        Math.max(-23, Math.min(23, target.position[0] + dx)),
        0,
        Math.max(-23, Math.min(23, target.position[2] + dz)),
      ];

      const newObjects = (prevWorld.placedObjects || []).map((obj) =>
        obj.id === selectedObjectId ? { ...obj, position: newPos } : obj
      );
      const decs = prevWorld.landscapeDecorations || JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
      const updatedDecorations = { ...decs, [prevWorld.landscapeType]: newObjects };
      const updatedWorld = { ...prevWorld, placedObjects: newObjects, landscapeDecorations: updatedDecorations };
      triggerAutoSave(updatedWorld);
      return updatedWorld;
    });
  };

  const handleRotateSelected = (deltaRad: number) => {
    if (!selectedObjectId) return;
    updateWorldObjects((currentObjects) =>
      currentObjects.map((obj) => {
        if (obj.id === selectedObjectId) {
          const newRotY = (obj.rotation[1] + deltaRad) % (Math.PI * 2);
          return {
            ...obj,
            rotation: [obj.rotation[0], newRotY, obj.rotation[2]] as [number, number, number],
          };
        }
        return obj;
      })
    );
  };

  const handleScaleSelected = (factor: number) => {
    if (!selectedObjectId) return;
    updateWorldObjects((currentObjects) =>
      currentObjects.map((obj) => {
        if (obj.id === selectedObjectId) {
          const currentScale = obj.scale[0];
          const newScale = Math.min(Math.max(currentScale * factor, 0.6), 2.2);
          return {
            ...obj,
            scale: [newScale, newScale, newScale] as [number, number, number],
          };
        }
        return obj;
      })
    );
  };

  const handleDuplicateSelected = () => {
    if (!selectedObjectId) return;
    let newClonedId: string | null = null;
    updateWorldObjects((currentObjects) => {
      const target = currentObjects.find((o) => o.id === selectedObjectId);
      if (!target) return currentObjects;

      const cloned: PlacedObject = {
        ...target,
        id: 'obj_' + Math.random().toString(36).substring(2, 9),
        position: [target.position[0] + 1.2, target.position[1], target.position[2] + 1.2],
        createdAt: new Date().toISOString(),
      };
      newClonedId = cloned.id;
      return [...currentObjects, cloned];
    });
    if (newClonedId) {
      setSelectedObjectId(newClonedId);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedObjectId) return;
    updateWorldObjects((currentObjects) =>
      currentObjects.filter((o) => o.id !== selectedObjectId)
    );
    setSelectedObjectId(null);
    setIsMovingSelected(false);
  };

  // Independent Landscapes (Request 6): Switch between Village, Mountain, River, City without resetting!
  const handleSwitchLandscape = (newLandscape: LandscapeType) => {
    setWorld((prevWorld) => {
      const decs = prevWorld.landscapeDecorations || JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
      // Save current landscape's objects
      const updatedDecorations = {
        ...decs,
        [prevWorld.landscapeType]: prevWorld.placedObjects || [],
      };
      // Fetch target landscape's independent objects
      const targetObjects =
        updatedDecorations[newLandscape] ||
        DEFAULT_LANDSCAPE_DECORATIONS[newLandscape] ||
        [];

      const clonedTargetObjects = JSON.parse(JSON.stringify(targetObjects));
      updatedDecorations[newLandscape] = clonedTargetObjects;

      const updatedWorld: World = {
        ...prevWorld,
        landscapeType: newLandscape,
        placedObjects: clonedTargetObjects,
        landscapeDecorations: updatedDecorations,
      };

      triggerAutoSave(updatedWorld);
      return updatedWorld;
    });

    setSelectedObjectId(null);
    setIsMovingSelected(false);
    setPlacementAssetType(null);
  };

  // When a secret daily gift is revealed, unlock it into the library and place one copy in current landscape!
  const handleGiftClaimed = (newObj: PlacedObject, assetId: string) => {
    setWorld((prevWorld) => {
      const existingUnlocked = prevWorld.unlockedAssetIds || [];
      const updatedUnlocked = existingUnlocked.includes(assetId)
        ? existingUnlocked
        : [...existingUnlocked, assetId];

      const currentObjects = prevWorld.placedObjects || [];
      const newObjects = [...currentObjects, newObj];
      const decs = prevWorld.landscapeDecorations || JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
      const updatedDecorations = {
        ...decs,
        [prevWorld.landscapeType]: newObjects,
      };

      const updatedWorld: World = {
        ...prevWorld,
        placedObjects: newObjects,
        landscapeDecorations: updatedDecorations,
        unlockedAssetIds: updatedUnlocked,
      };

      triggerAutoSave(updatedWorld);
      return updatedWorld;
    });

    setSelectedObjectId(newObj.id);
    setDailyGiftAvailable(false);
  };

  const handleTimeOfDayChange = (time: TimeOfDay) => {
    const updated = {
      ...world,
      settings: {
        ...world.settings,
        timeOfDay: time,
      },
    };
    setWorld(updated);
    triggerAutoSave(updated);
  };

  const handleToggleSnowfall = () => {
    const nextDensity = world.settings.snowfallDensity === 'off' ? 'moderate' : 'off';
    const updated = {
      ...world,
      settings: {
        ...world.settings,
        snowfallDensity: nextDensity as 'off' | 'moderate',
      },
    };
    setWorld(updated);
    triggerAutoSave(updated);
  };

  const handleToggleSound = () => {
    const next = !world.settings.soundEnabled;
    soundEngine.setEnabled(next);
    const updated = {
      ...world,
      settings: {
        ...world.settings,
        soundEnabled: next,
      },
    };
    setWorld(updated);
    triggerAutoSave(updated);
  };

  const handleManualSave = async () => {
    setSaveStatus('saving');
    const res = await saveWorld(world, user, currentUser);
    setSaveStatus(res.success ? 'saved' : 'error');
    setSaveMode(res.mode);
  };

  const handleTriggerSanta = useCallback(() => {
    if (!canvasRef.current) return;
    const animType = canvasRef.current.triggerSantaAnimation(() => {
      setSantaToast(null);
    });

    if (animType === 'sky') {
      setSantaToast({
        title: '🎅 Santa & Rudolph Flying Across The Sky! ✨',
        subtitle: 'Listen to the soaring sleigh bells and stardust over the snowy peaks!',
        type: 'sky',
      });
    } else {
      setSantaToast({
        title: '🤫 Santa Sneaking Secretly Behind The Houses... 🏡',
        subtitle: 'Watch his lantern swing gently behind the cozy village cabins and pine trees!',
        type: 'ground',
      });
    }

    window.setTimeout(() => {
      setSantaToast((prev) => (prev ? null : prev));
    }, 7000);
  }, []);

  // Find currently selected object data
  const selectedObject = world.placedObjects.find((o) => o.id === selectedObjectId) || null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d1723] select-none">
      {/* 1. Main 3D Interactive World Viewport */}
      <WorldCanvas
        ref={canvasRef}
        landscapeType={world.landscapeType}
        placedObjects={world.placedObjects}
        selectedObjectId={selectedObjectId}
        placementAssetType={placementAssetType}
        isMovingSelected={isMovingSelected}
        timeOfDay={world.settings.timeOfDay}
        snowfallDensity={world.settings.snowfallDensity}
        onSelectObject={handleSelectObject}
        onPlaceObjectAt={handlePlaceObjectAt}
        onMoveObjectTo={handleMoveObjectTo}
      />

      {/* 2. Top Header Bar */}
      <TopBar
        timeOfDay={world.settings.timeOfDay}
        onTimeOfDayChange={handleTimeOfDayChange}
        snowfallDensity={world.settings.snowfallDensity}
        onToggleSnowfall={handleToggleSnowfall}
        soundEnabled={world.settings.soundEnabled}
        onToggleSound={handleToggleSound}
        saveStatus={saveStatus}
        saveMode={saveMode}
        onSaveWorld={handleManualSave}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenGifts={() => setIsGiftModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onResetCamera={() => canvasRef.current?.resetCamera()}
        user={user}
        currentUser={currentUser}
        dailyGiftAvailable={dailyGiftAvailable}
        onTriggerSanta={handleTriggerSanta}
      />

      {/* Magical Santa Animation Active Notification Banner */}
      {santaToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-lg w-[92vw] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="winter-panel-gold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-[#e5c783]/60 bg-[#0e1c2e]/95 backdrop-blur-md">
            <span className="text-2xl sm:text-3xl animate-bounce">
              {santaToast.type === 'sky' ? '🛷' : '🏮'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#e5c783] font-serif-display truncate">
                {santaToast.title}
              </div>
              <div className="text-[11px] sm:text-xs text-[#cfdbe5] leading-tight">
                {santaToast.subtitle}
              </div>
            </div>
            <button
              onClick={() => setSantaToast(null)}
              className="text-[#91a1b1] hover:text-white p-1 text-xs cursor-pointer ml-1"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. Ergonomic Bottom Builder Dock (Zero Viewport Occlusion) */}
      <BottomDock
        selectedObject={selectedObject}
        activePlacementAsset={placementAssetType}
        isMovingSelected={isMovingSelected}
        currentLandscape={world.landscapeType}
        unlockedAssetIds={world.unlockedAssetIds}
        landscapeDecorations={world.landscapeDecorations}
        onSelectPlacementAsset={(assetId) => {
          setSelectedObjectId(null);
          setIsMovingSelected(false);
          setPlacementAssetType(assetId);
        }}
        onConfirmPlacementAtCenter={() => {
          handlePlaceObjectAt([0, 0, 0]);
        }}
        onCancelPlacement={() => setPlacementAssetType(null)}
        onToggleMoveSelected={() => setIsMovingSelected(!isMovingSelected)}
        onNudgeSelected={handleNudgeSelected}
        onDeselect={() => {
          setSelectedObjectId(null);
          setIsMovingSelected(false);
        }}
        onRotateSelected={handleRotateSelected}
        onScaleSelected={handleScaleSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={handleDeleteSelected}
        onSwitchLandscape={handleSwitchLandscape}
        onSetCameraAngle={(angle) => canvasRef.current?.setCinematicAngle(angle)}
        onOpenGifts={() => setIsGiftModalOpen(true)}
      />

      {/* 4. Welcome Screen Overlay for First Experience */}
      {showWelcome && (
        <WelcomeScreen
          hasExistingWorld={hasExistingSavedWorld}
          onContinueExisting={handleContinueExisting}
          onCreateNewWorld={handleCreateNewWorld}
        />
      )}

      {/* 5. Daily Gift Modal */}
      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        user={user}
        currentUser={currentUser}
        worldId={world.id}
        unlockedAssetIds={world.unlockedAssetIds}
        onGiftClaimed={handleGiftClaimed}
        onPlaceNow={(assetId) => {
          setSelectedObjectId(null);
          setIsMovingSelected(false);
          setPlacementAssetType(assetId);
        }}
      />

      {/* 6. Image Export Modal */}
      <ImageExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        getCanvasDataUrl={(aspectRatio) =>
          canvasRef.current?.captureSnapshot(aspectRatio) || null
        }
      />

      {/* 7. Local Account / Cloud Persistence Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={async (newUser) => {
          setCurrentUser(newUser);
          if (newUser) {
            const cloudWorld = await loadWorld(user, newUser);
            if (cloudWorld) {
              setWorld(cloudWorld);
            } else {
              saveWorld(world, user, newUser);
            }
            setSaveMode('cloud');
          } else {
            setSaveMode('local');
          }
        }}
        onManualSync={handleManualSave}
      />
    </div>
  );
}

export default App;
