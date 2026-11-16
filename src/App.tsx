import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorldCanvas, WorldCanvasHandle } from './game/WorldCanvas';
import { TopBar } from './components/layout/TopBar';
import { BottomDock } from './components/layout/BottomDock';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { GiftModal } from './features/gifts/GiftModal';
import { ImageExportModal } from './features/export/ImageExportModal';
import { AuthModal } from './features/auth/AuthModal';
import { ProModal } from './components/modals/ProModal';
import { PrivacyLegalModal, LegalModalTab } from './components/modals/PrivacyLegalModal';
import { PWAInstallModal } from './components/ui/PWAInstallModal';
import { World, LandscapeType, PlacedObject, TimeOfDay } from './features/world/worldTypes';
import {
  createDefaultWorld,
  saveWorld,
  loadWorld,
  loadGoogleCloudWorld,
  sanitizeWorldForFirstCloudSave,
  DEFAULT_LANDSCAPE_DECORATIONS,
  enforceFreeLandscapeAccess,
  isProOnlyLandscape,
} from './features/world/worldPersistence';
import { isAssetUnlocked, DEFAULT_FREE_ASSET_IDS } from './game/assets/assetCatalog';
import { checkDailyGiftClaimed, fetchDailyRewardsState } from './features/gifts/giftService';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { soundEngine } from './lib/audioSynthesis';
import { youtubeAudio } from './lib/youtubePlayerService';
import { usePWAInstall } from './lib/usePWAInstall';
import { User } from '@supabase/supabase-js';
import { AppUser, getStoredUser, checkProStatus, fetchServerAuthSession } from './features/auth/userAuthService';

export function App() {
  const [world, setWorld] = useState<World>(() => createDefaultWorld('village'));
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredUser());
  const [isProUser, setIsProUser] = useState<boolean>(false);
  const [hasExistingSavedWorld, setHasExistingSavedWorld] = useState<boolean>(false);
  const [authHydrated, setAuthHydrated] = useState<boolean>(false);
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
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalModalTab>('privacy');
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState<boolean>(false);

  // PWA Hook
  const { isInstallable, isStandalone, isIOS, installPWA } = usePWAInstall();

  const [santaToast, setSantaToast] = useState<{
    title: string;
    subtitle: string;
    type: 'sky' | 'ground';
  } | null>(null);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);

  const canvasRef = useRef<WorldCanvasHandle | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const pendingSaveWorldRef = useRef<World | null>(null);
  const bootDoneRef = useRef<boolean>(false);
  const latestCloudRevRef = useRef<{ worldId: string; revision: number } | null>(null);
  const currentUserRef = useRef<AppUser | null>(currentUser);
  const userRef = useRef<User | null>(user);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const showCloudNotice = useCallback((message: string) => {
    setCloudNotice(message);
    window.setTimeout(() => {
      setCloudNotice((prev) => (prev === message ? null : prev));
    }, 5500);
  }, []);

  const proReturnPollTimerRef = useRef<number | null>(null);

  // 1. Initialize Auth, Pro Status, and Load Existing World
  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      let supaUser: User | null = null;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          supaUser = data.session?.user || null;
          if (supaUser?.email && supaUser.email.toLowerCase().includes('kofidis')) {
            try {
              await supabase.auth.signOut();
            } catch {
              // ignore
            }
            supaUser = null;
          }
          setUser(supaUser);

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

      // Restore verified Google session & authoritative Pro entitlement from server HttpOnly cookie
      const serverSession = await fetchServerAuthSession();
      if (isCancelled) return;
      const activeAppUser =
        serverSession.authenticated && serverSession.user ? serverSession.user : null;

      setCurrentUser(activeAppUser);
      currentUserRef.current = activeAppUser;

      // Server is authoritative for Pro status (never trust localStorage)
      let proActive = activeAppUser?.provider === 'google' ? serverSession.isPro : false;

      // Handle Paddle Checkout redirect return (?pro_success=true)
      const returnedFromProCheckout =
        typeof window !== 'undefined' && window.location.search.includes('pro_success=true');
      if (returnedFromProCheckout) {
        const refreshedPro = activeAppUser?.provider === 'google' ? await checkProStatus() : false;
        if (refreshedPro) {
          proActive = true;
        }
        const url = new URL(window.location.href);
        url.searchParams.delete('pro_success');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);

        // Retry shortly in case iOS Safari redirected back before Paddle webhook completed
        if (!proActive && activeAppUser?.provider === 'google' && !isCancelled) {
          let attempts = 0;
          const scheduleRetry = () => {
            if (isCancelled || attempts >= 3) return;
            attempts += 1;
            proReturnPollTimerRef.current = window.setTimeout(async () => {
              if (isCancelled) return;
              const active = await checkProStatus();
              if (isCancelled) return;
              if (active) {
                setIsProUser(true);
                setIsGiftModalOpen(false);
                setDailyGiftAvailable(false);
              } else {
                scheduleRetry();
              }
            }, 2000);
          };
          scheduleRetry();
        }
      }

      if (activeAppUser && activeAppUser.provider === 'google') {
        const [cloudRes, rewardState] = await Promise.all([
          loadGoogleCloudWorld(activeAppUser),
          fetchDailyRewardsState(activeAppUser.id),
        ]);

        if (rewardState.ok && rewardState.isPro) {
          proActive = true;
        }
        setIsProUser(proActive);
        if (proActive) {
          setIsGiftModalOpen(false);
        }

        if (cloudRes.exists && cloudRes.world) {
          const mergedUnlocked = Array.from(
            new Set([
              ...DEFAULT_FREE_ASSET_IDS,
              ...(cloudRes.world.unlockedAssetIds || []),
              ...(rewardState.ok ? rewardState.unlockedAssetIds : []),
            ])
          );
          const mergedWorld: World = {
            ...cloudRes.world,
            unlockedAssetIds: mergedUnlocked,
          };
          const { world: safeSaved } = enforceFreeLandscapeAccess(mergedWorld, proActive);
          latestCloudRevRef.current = {
            worldId: safeSaved.id,
            revision: safeSaved.revision ?? 0,
          };
          setWorld(safeSaved);
          setHasExistingSavedWorld(true);
          setSaveMode('cloud');
        } else if (!cloudRes.exists && !cloudRes.networkError) {
          // Brand new Google account with no world in Supabase yet
          const initialCloud = sanitizeWorldForFirstCloudSave(
            createDefaultWorld('village', activeAppUser.id),
            activeAppUser.id,
            proActive,
            rewardState.ok ? rewardState.unlockedAssetIds : []
          );
          latestCloudRevRef.current = { worldId: initialCloud.id, revision: 0 };
          setWorld(initialCloud);
          setSaveMode('cloud');

          const saveRes = await saveWorld(initialCloud, supaUser, activeAppUser);
          if (saveRes.success && typeof saveRes.revision === 'number') {
            latestCloudRevRef.current = {
              worldId: initialCloud.id,
              revision: saveRes.revision,
            };
            setWorld((prev) =>
              prev.id === initialCloud.id
                ? {
                    ...prev,
                    revision: saveRes.revision,
                    updatedAt: saveRes.updatedAt || prev.updatedAt,
                    unlockedAssetIds: saveRes.unlockedAssetIds || prev.unlockedAssetIds,
                  }
                : prev
            );
          }
        } else {
          setSaveMode('cloud');
        }

        setDailyGiftAvailable(
          proActive
            ? false
            : rewardState.ok
            ? rewardState.remainingToday > 0
            : true
        );
      } else {
        setIsProUser(false);
        setSaveMode('local');
        const guestSaved = await loadWorld(null, null);
        if (guestSaved) {
          const { world: safeSaved } = enforceFreeLandscapeAccess(guestSaved, false);
          setWorld(safeSaved);
          setHasExistingSavedWorld(true);
        }
        const claimed = await checkDailyGiftClaimed(null, 0, undefined, false);
        setDailyGiftAvailable(!claimed);
      }

      bootDoneRef.current = true;
      setAuthHydrated(true);
    };

    init();
    return () => {
      isCancelled = true;
      if (proReturnPollTimerRef.current) {
        window.clearTimeout(proReturnPollTimerRef.current);
      }
    };
  }, []);

  // Update daily gift check and Pro status when user changes after initial boot
  useEffect(() => {
    if (!bootDoneRef.current) return;

    const syncUserStatus = async () => {
      const proActive = currentUser?.provider === 'google' ? await checkProStatus() : false;
      setIsProUser(proActive);
      if (proActive) {
        setIsGiftModalOpen(false);
      }

      if (!proActive) {
        setWorld((prevWorld) => {
          const { world: safeWorld, switched } = enforceFreeLandscapeAccess(prevWorld, false);
          if (switched) {
            setSelectedObjectId(null);
            setIsMovingSelected(false);
            setPlacementAssetType(null);
          }
          return safeWorld;
        });
      }

      if (proActive) {
        setDailyGiftAvailable(false);
      } else {
        const claimed = await checkDailyGiftClaimed(user, 0, currentUser?.id, false);
        setDailyGiftAvailable(!claimed);
      }
    };
    syncUserStatus();
  }, [user, currentUser]);

  // Ensure GiftModal immediately closes if user upgrades to Pro
  useEffect(() => {
    if (isProUser && isGiftModalOpen) {
      setIsGiftModalOpen(false);
    }
  }, [isProUser, isGiftModalOpen]);

  // Reactive safety guard: prevent unentitled access to Wonderworld or locked Pro placement after auth hydration
  useEffect(() => {
    if (!authHydrated || isProUser) return;

    if (isProOnlyLandscape(world.landscapeType)) {
      setWorld((prevWorld) => {
        const { world: safeWorld } = enforceFreeLandscapeAccess(prevWorld, false);
        return safeWorld;
      });
      setSelectedObjectId(null);
      setIsMovingSelected(false);
      setPlacementAssetType(null);
    } else if (
      placementAssetType &&
      !isAssetUnlocked(placementAssetType, world.unlockedAssetIds, false)
    ) {
      setPlacementAssetType(null);
    }
  }, [authHydrated, isProUser, world.landscapeType, world.unlockedAssetIds, placementAssetType]);

  // Re-verify authoritative server Pro status when a signed-in Google session regains window focus
  useEffect(() => {
    if (!currentUser || currentUser.provider !== 'google') return;

    let lastCheckedAt = 0;
    const handleFocusRecheck = async () => {
      const now = Date.now();
      if (now - lastCheckedAt < 15000) return;
      lastCheckedAt = now;

      const proActive = await checkProStatus();
      setIsProUser(proActive);
      if (proActive) {
        setIsGiftModalOpen(false);
        setDailyGiftAvailable(false);
      } else {
        setWorld((prevWorld) => {
          const { world: safeWorld, switched } = enforceFreeLandscapeAccess(prevWorld, false);
          if (switched) {
            setSelectedObjectId(null);
            setIsMovingSelected(false);
            setPlacementAssetType(null);
          }
          return safeWorld;
        });
      }
    };

    window.addEventListener('focus', handleFocusRecheck);
    return () => {
      window.removeEventListener('focus', handleFocusRecheck);
    };
  }, [currentUser]);

  // Autoplay vintage Christmas music on first user gesture (touchend/click/keydown required on iOS Safari)
  useEffect(() => {
    const startAudioOnGesture = () => {
      const state = youtubeAudio.getState();
      if (!state.isMuted && !state.isPlaying) {
        youtubeAudio.play();
      }
      window.removeEventListener('touchend', startAudioOnGesture);
      window.removeEventListener('click', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
    };

    window.addEventListener('touchend', startAudioOnGesture, { once: true, passive: true });
    window.addEventListener('click', startAudioOnGesture, { once: true, passive: true });
    window.addEventListener('keydown', startAudioOnGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('touchend', startAudioOnGesture);
      window.removeEventListener('click', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
    };
  }, []);

  // 2. Debounced Auto-Save with Optimistic Concurrency Control
  const triggerAutoSave = useCallback(
    (worldToSave: World) => {
      setSaveStatus('saving');
      pendingSaveWorldRef.current = worldToSave;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        pendingSaveWorldRef.current = null;
        const activeUser = currentUserRef.current;
        const knownRev =
          latestCloudRevRef.current && latestCloudRevRef.current.worldId === worldToSave.id
            ? latestCloudRevRef.current.revision
            : worldToSave.revision;

        const payloadWorld: World = {
          ...worldToSave,
          revision: typeof knownRev === 'number' ? knownRev : 0,
        };

        const res = await saveWorld(payloadWorld, user, activeUser);

        // Ignore stale callback if auth session changed mid-flight
        if ((currentUserRef.current?.id || null) !== (activeUser?.id || null)) {
          return;
        }

        if (res.success) {
          setSaveStatus('saved');
          setSaveMode(res.mode);
          if (res.mode === 'cloud' && typeof res.revision === 'number') {
            latestCloudRevRef.current = {
              worldId: payloadWorld.id,
              revision: res.revision,
            };
            setWorld((prev) =>
              prev.id === payloadWorld.id
                ? {
                    ...prev,
                    revision: res.revision,
                    updatedAt: res.updatedAt || prev.updatedAt,
                    unlockedAssetIds: res.unlockedAssetIds || prev.unlockedAssetIds,
                  }
                : prev
            );
          }
        } else if (res.conflict && res.serverWorld) {
          const { world: safeServerWorld } = enforceFreeLandscapeAccess(
            res.serverWorld as World,
            isProUser
          );
          latestCloudRevRef.current = {
            worldId: safeServerWorld.id,
            revision: safeServerWorld.revision ?? 0,
          };
          setWorld(safeServerWorld);
          setSaveStatus('saved');
          setSaveMode('cloud');
          showCloudNotice('World synced with newer edits saved from another session or device.');
        } else {
          setSaveStatus('error');
        }
      }, 700);
    },
    [user, isProUser, showCloudNotice]
  );

  // Flush pending unsaved changes immediately when iOS Safari backgrounds or closes the tab
  useEffect(() => {
    const flushPendingSave = () => {
      const pending = pendingSaveWorldRef.current;
      if (!pending) return;

      pendingSaveWorldRef.current = null;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      const activeUser = currentUserRef.current;
      const knownRev =
        latestCloudRevRef.current && latestCloudRevRef.current.worldId === pending.id
          ? latestCloudRevRef.current.revision
          : pending.revision;

      const payloadWorld: World = {
        ...pending,
        revision: typeof knownRev === 'number' ? knownRev : 0,
      };

      void saveWorld(payloadWorld, userRef.current, activeUser, { keepalive: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };

    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle Welcome Screen actions
  const handleContinueExisting = () => {
    setShowWelcome(false);
    youtubeAudio.play();
    soundEngine.playWinterBreeze();
  };

  const handleCreateNewWorld = (landscape: LandscapeType) => {
    if (landscape === 'wonderworld' && !isProUser) {
      setIsProModalOpen(true);
      return;
    }
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

  // 3. Object Manipulation Actions
  const handlePlaceObjectAt = (position: [number, number, number], assetTypeOverride?: string) => {
    const assetToPlace = assetTypeOverride || placementAssetType;
    if (!assetToPlace) return;

    if (!isAssetUnlocked(assetToPlace, world.unlockedAssetIds, isProUser)) {
      setPlacementAssetType(null);
      setIsProModalOpen(true);
      return;
    }

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
    setPlacementAssetType(null);
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
    const selectedTarget = (world.placedObjects || []).find((o) => o.id === selectedObjectId);
    if (
      selectedTarget &&
      !isAssetUnlocked(selectedTarget.assetType, world.unlockedAssetIds, isProUser)
    ) {
      setIsProModalOpen(true);
      return;
    }

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

  // Switch landscapes
  const handleSwitchLandscape = (newLandscape: LandscapeType) => {
    if (newLandscape === 'wonderworld' && !isProUser) {
      setIsProModalOpen(true);
      return;
    }

    setWorld((prevWorld) => {
      const decs = prevWorld.landscapeDecorations || JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
      const updatedDecorations = {
        ...decs,
        [prevWorld.landscapeType]: prevWorld.placedObjects || [],
      };
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

  const handleGiftClaimed = (
    newObj: PlacedObject,
    assetId: string,
    serverWorldRevision?: number,
    serverUnlockedAssetIds?: string[]
  ) => {
    if (typeof serverWorldRevision === 'number') {
      latestCloudRevRef.current = {
        worldId: world.id,
        revision: serverWorldRevision,
      };
    }

    setWorld((prevWorld) => {
      const existingUnlocked = prevWorld.unlockedAssetIds || [];
      const updatedUnlocked =
        serverUnlockedAssetIds && serverUnlockedAssetIds.length > 0
          ? Array.from(new Set([...existingUnlocked, ...serverUnlockedAssetIds, assetId]))
          : existingUnlocked.includes(assetId)
          ? existingUnlocked
          : [...existingUnlocked, assetId];

      const currentObjects = prevWorld.placedObjects || [];
      const newObjects = [...currentObjects, newObj];
      const decs =
        prevWorld.landscapeDecorations ||
        JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_DECORATIONS));
      const updatedDecorations = {
        ...decs,
        [prevWorld.landscapeType]: newObjects,
      };

      const updatedWorld: World = {
        ...prevWorld,
        placedObjects: newObjects,
        landscapeDecorations: updatedDecorations,
        unlockedAssetIds: updatedUnlocked,
        revision:
          typeof serverWorldRevision === 'number'
            ? serverWorldRevision
            : prevWorld.revision,
      };

      triggerAutoSave(updatedWorld);
      return updatedWorld;
    });

    setSelectedObjectId(newObj.id);
    if (!isProUser) {
      checkDailyGiftClaimed(user, 0, currentUser?.id, isProUser).then((claimed) => {
        setDailyGiftAvailable(!claimed);
      });
    } else {
      setDailyGiftAvailable(false);
    }
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
    pendingSaveWorldRef.current = null;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const knownRev =
      latestCloudRevRef.current && latestCloudRevRef.current.worldId === world.id
        ? latestCloudRevRef.current.revision
        : world.revision;

    const payloadWorld: World = {
      ...world,
      revision: typeof knownRev === 'number' ? knownRev : 0,
    };

    const res = await saveWorld(payloadWorld, user, currentUser);
    if (res.success) {
      setSaveStatus('saved');
      setSaveMode(res.mode);
      if (res.mode === 'cloud' && typeof res.revision === 'number') {
        latestCloudRevRef.current = {
          worldId: payloadWorld.id,
          revision: res.revision,
        };
        setWorld((prev) =>
          prev.id === payloadWorld.id
            ? {
                ...prev,
                revision: res.revision,
                updatedAt: res.updatedAt || prev.updatedAt,
                unlockedAssetIds: res.unlockedAssetIds || prev.unlockedAssetIds,
              }
            : prev
        );
      }
    } else if (res.conflict && res.serverWorld) {
      const { world: safeServerWorld } = enforceFreeLandscapeAccess(
        res.serverWorld as World,
        isProUser
      );
      latestCloudRevRef.current = {
        worldId: safeServerWorld.id,
        revision: safeServerWorld.revision ?? 0,
      };
      setWorld(safeServerWorld);
      setSaveStatus('saved');
      setSaveMode('cloud');
      showCloudNotice('World synced with newer edits saved from another session or device.');
    } else {
      setSaveStatus('error');
    }
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

  const selectedObject = world.placedObjects.find((o) => o.id === selectedObjectId) || null;
  const showDailyGifts = authHydrated && !isProUser;

  return (
    <div className="relative app-viewport overflow-hidden bg-[#0d1723] select-none">
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
        onOpenGifts={() => {
          if (showDailyGifts) {
            setIsGiftModalOpen(true);
          }
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onResetCamera={() => canvasRef.current?.resetCamera()}
        user={user}
        currentUser={currentUser}
        dailyGiftAvailable={dailyGiftAvailable}
        showDailyGifts={showDailyGifts}
        isProUser={isProUser}
        onTriggerSanta={handleTriggerSanta}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenPWAInstall={() => setIsPWAInstallModalOpen(true)}
        onOpenPrivacyLegal={() => {
          setLegalModalTab('privacy');
          setIsPrivacyModalOpen(true);
        }}
        onOpenRefundPolicy={() => {
          setLegalModalTab('refund');
          setIsPrivacyModalOpen(true);
        }}
      />

      {/* Cloud Sync Conflict / Multi-Device Notice */}
      {cloudNotice && (
        <div className="fixed safe-top-cloud left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-[90vw] sm:w-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="winter-panel-gold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border-[#e5c783]/60 bg-[#0e1c2e]/95 text-xs text-amber-100">
            <span>☁️</span>
            <span className="flex-1">{cloudNotice}</span>
            <button
              onClick={() => setCloudNotice(null)}
              className="text-[#91a1b1] hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Magical Santa Animation Active Notification Banner */}
      {santaToast && (
        <div className="fixed safe-top-toast left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-lg w-[92vw] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
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

      {/* 3. Builder Dock */}
      <BottomDock
        selectedObject={selectedObject}
        activePlacementAsset={placementAssetType}
        isMovingSelected={isMovingSelected}
        currentLandscape={world.landscapeType}
        unlockedAssetIds={world.unlockedAssetIds}
        landscapeDecorations={world.landscapeDecorations}
        isProUser={isProUser}
        showDailyGifts={showDailyGifts}
        onSelectPlacementAsset={(assetId) => {
          if (assetId && !isAssetUnlocked(assetId, world.unlockedAssetIds, isProUser)) {
            setIsProModalOpen(true);
            return;
          }
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
        onOpenGifts={() => {
          if (showDailyGifts) {
            setIsGiftModalOpen(true);
          }
        }}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* 4. Welcome Screen Overlay */}
      {showWelcome && (
        <WelcomeScreen
          hasExistingWorld={hasExistingSavedWorld}
          isProUser={isProUser}
          onContinueExisting={handleContinueExisting}
          onCreateNewWorld={handleCreateNewWorld}
          onOpenProModal={() => setIsProModalOpen(true)}
          onOpenPWAInstall={() => setIsPWAInstallModalOpen(true)}
          onOpenPrivacyLegal={() => {
            setLegalModalTab('privacy');
            setIsPrivacyModalOpen(true);
          }}
          onOpenRefundPolicy={() => {
            setLegalModalTab('refund');
            setIsPrivacyModalOpen(true);
          }}
        />
      )}

      {/* 5. Daily Gift Modal (Hidden for Pro users) */}
      {showDailyGifts && (
        <GiftModal
          isOpen={isGiftModalOpen}
          onClose={() => setIsGiftModalOpen(false)}
          user={user}
          currentUser={currentUser}
          worldId={world.id}
          unlockedAssetIds={world.unlockedAssetIds}
          isProUser={isProUser}
          onGiftClaimed={handleGiftClaimed}
          onPlaceNow={(assetId) => {
            setSelectedObjectId(null);
            setIsMovingSelected(false);
            setPlacementAssetType(assetId);
          }}
          onOpenProModal={() => setIsProModalOpen(true)}
        />
      )}

      {/* 6. Image Export Modal */}
      <ImageExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        getCanvasDataUrl={(aspectRatio) =>
          canvasRef.current?.captureSnapshot(aspectRatio) || null
        }
      />

      {/* 7. Account & Cloud Persistence Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        isProUser={isProUser}
        onUserChanged={async (newUser) => {
          pendingSaveWorldRef.current = null;
          if (saveTimeoutRef.current) {
            window.clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }
          currentUserRef.current = newUser;
          setCurrentUser(newUser);

          if (newUser && newUser.provider === 'google') {
            let verifiedPro =
              newUser.isPro !== undefined ? Boolean(newUser.isPro) : await checkProStatus();

            const [cloudRes, rewardState] = await Promise.all([
              loadGoogleCloudWorld(newUser),
              fetchDailyRewardsState(newUser.id),
            ]);

            if (rewardState.ok && rewardState.isPro) {
              verifiedPro = true;
            }
            setIsProUser(verifiedPro);
            if (verifiedPro) {
              setIsGiftModalOpen(false);
            }

            if (cloudRes.exists && cloudRes.world) {
              // Existing Google cloud world found: load it cleanly without overwriting with Guest storage
              const mergedUnlocked = Array.from(
                new Set([
                  ...DEFAULT_FREE_ASSET_IDS,
                  ...(cloudRes.world.unlockedAssetIds || []),
                  ...(rewardState.ok ? rewardState.unlockedAssetIds : []),
                ])
              );
              const mergedWorld: World = {
                ...cloudRes.world,
                unlockedAssetIds: mergedUnlocked,
              };
              const { world: safeCloudWorld } = enforceFreeLandscapeAccess(
                mergedWorld,
                verifiedPro
              );
              latestCloudRevRef.current = {
                worldId: safeCloudWorld.id,
                revision: safeCloudWorld.revision ?? 0,
              };
              setSelectedObjectId(null);
              setIsMovingSelected(false);
              setPlacementAssetType(null);
              setWorld(safeCloudWorld);
              setHasExistingSavedWorld(true);
              setSaveMode('cloud');
              setSaveStatus('saved');
            } else if (!cloudRes.exists && !cloudRes.networkError) {
              // First-time Google sign-in: safely initialize first cloud world in Supabase
              const firstCloudWorld = sanitizeWorldForFirstCloudSave(
                world,
                newUser.id,
                verifiedPro,
                rewardState.ok ? rewardState.unlockedAssetIds : []
              );
              latestCloudRevRef.current = { worldId: firstCloudWorld.id, revision: 0 };
              setWorld(firstCloudWorld);
              setSaveMode('cloud');
              setSaveStatus('saving');

              const saveRes = await saveWorld(firstCloudWorld, user, newUser);
              if (saveRes.success && typeof saveRes.revision === 'number') {
                latestCloudRevRef.current = {
                  worldId: firstCloudWorld.id,
                  revision: saveRes.revision,
                };
                setWorld((prev) =>
                  prev.id === firstCloudWorld.id
                    ? {
                        ...prev,
                        revision: saveRes.revision,
                        updatedAt: saveRes.updatedAt || prev.updatedAt,
                        unlockedAssetIds: saveRes.unlockedAssetIds || prev.unlockedAssetIds,
                      }
                    : prev
                );
                setSaveStatus('saved');
              } else {
                setSaveStatus('error');
              }
            } else {
              setSaveMode('cloud');
            }

            setDailyGiftAvailable(
              verifiedPro
                ? false
                : rewardState.ok
                ? rewardState.remainingToday > 0
                : true
            );
          } else {
            // Logout -> Switch cleanly back to Guest Mode without touching Supabase cloud data
            latestCloudRevRef.current = null;
            setIsProUser(false);
            setIsGiftModalOpen(false);
            setSaveMode('local');
            setSaveStatus('saved');
            setSelectedObjectId(null);
            setIsMovingSelected(false);
            setPlacementAssetType(null);

            const guestSaved = await loadWorld(null, null);
            const guestWorld = guestSaved || createDefaultWorld('village');
            const { world: safeGuestWorld } = enforceFreeLandscapeAccess(guestWorld, false);
            setWorld(safeGuestWorld);
            setHasExistingSavedWorld(Boolean(guestSaved));

            const claimed = await checkDailyGiftClaimed(null, 0, undefined, false);
            setDailyGiftAvailable(!claimed);
          }
        }}
        onManualSync={handleManualSave}
      />

      {/* 8. Christmas Pro Plan Modal (€1.99 Paddle Checkout) */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        user={currentUser}
        onProUnlocked={() => {
          setIsProUser(true);
          setIsGiftModalOpen(false);
          setDailyGiftAvailable(false);
        }}
        onProRevoked={() => {
          setIsProUser(false);
          setSelectedObjectId(null);
          setIsMovingSelected(false);
          setPlacementAssetType(null);
          setWorld((prevWorld) => {
            const { world: safeWorld, switched } = enforceFreeLandscapeAccess(prevWorld, false);
            if (switched) {
              triggerAutoSave(safeWorld);
            }
            return safeWorld;
          });
        }}
        onRequireGoogleAuth={() => {
          setIsProModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onOpenRefundPolicy={() => {
          setLegalModalTab('refund');
          setIsPrivacyModalOpen(true);
        }}
      />

      {/* 9. Privacy Policy, Terms & Refund Policy Modal */}
      <PrivacyLegalModal
        isOpen={isPrivacyModalOpen}
        initialTab={legalModalTab}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* 10. PWA Installation Modal */}
      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
        installPWA={installPWA}
        isInstallable={isInstallable}
        isIOS={isIOS}
        isStandalone={isStandalone}
      />
    </div>
  );
}

export default App;
