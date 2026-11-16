import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PlacedObject, LandscapeType, TimeOfDay } from '../features/world/worldTypes';
import { createSnowTerrain } from './SnowTerrain';
import { generateLandscape } from './landscapes/landscapeGenerators';
import { createAssetObject } from './assets/proceduralModels';
import { disposeObjectTree } from './assets/modelMaterials';
import { SkyAndLighting } from './SkyAndLighting';
import { SnowfallSystem } from './Snowfall';
import { soundEngine } from '../lib/audioSynthesis';
import { SantaAnimationSystem, SantaAnimType } from './animations/SantaAnimationSystem';

export interface WorldCanvasHandle {
  captureSnapshot: (aspectRatio: 'standard' | 'square' | 'vertical') => string | null;
  resetCamera: () => void;
  setCinematicAngle: (angle: 'overview' | 'close' | 'top') => void;
  triggerSantaAnimation: (onComplete?: () => void) => SantaAnimType;
}

interface Props {
  landscapeType: LandscapeType;
  placedObjects: PlacedObject[];
  selectedObjectId: string | null;
  placementAssetType: string | null; // active asset being placed
  isMovingSelected: boolean;
  timeOfDay: TimeOfDay;
  snowfallDensity: 'off' | 'light' | 'moderate' | 'heavy';
  onSelectObject: (id: string | null) => void;
  onPlaceObjectAt: (position: [number, number, number], assetTypeOverride?: string) => void;
  onMoveObjectTo: (id: string, position: [number, number, number]) => void;
  onCameraMove?: (pos: [number, number, number], target: [number, number, number]) => void;
}

export const WorldCanvas = forwardRef<WorldCanvasHandle, Props>(({
  landscapeType,
  placedObjects,
  selectedObjectId,
  placementAssetType,
  isMovingSelected,
  timeOfDay,
  snowfallDensity,
  onSelectObject,
  onPlaceObjectAt,
  onMoveObjectTo,
  onCameraMove,
}, ref) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const skyRef = useRef<SkyAndLighting | null>(null);
  const snowfallRef = useRef<SnowfallSystem | null>(null);
  const santaSystemRef = useRef<SantaAnimationSystem | null>(null);

  // Group references
  const landscapeGroupRef = useRef<THREE.Group | null>(null);
  const placedObjectsGroupRef = useRef<THREE.Group | null>(null);
  const selectionIndicatorRef = useRef<THREE.Group | null>(null);
  const placementCursorRef = useRef<THREE.Group | null>(null);

  const [webglError, setWebglError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);

  // State refs for event listeners
  const placementAssetTypeRef = useRef(placementAssetType);
  placementAssetTypeRef.current = placementAssetType;
  const isMovingSelectedRef = useRef(isMovingSelected);
  isMovingSelectedRef.current = isMovingSelected;
  const selectedObjectIdRef = useRef(selectedObjectId);
  selectedObjectIdRef.current = selectedObjectId;
  const placedObjectsRef = useRef(placedObjects);
  placedObjectsRef.current = placedObjects;
  const timeOfDayRef = useRef(timeOfDay);
  timeOfDayRef.current = timeOfDay;
  const draggedPosRef = useRef<{ id: string; pos: [number, number] } | null>(null);

  // Callback refs to prevent stale closure bugs in pointer handlers
  const onSelectObjectRef = useRef(onSelectObject);
  onSelectObjectRef.current = onSelectObject;
  const onPlaceObjectAtRef = useRef(onPlaceObjectAt);
  onPlaceObjectAtRef.current = onPlaceObjectAt;
  const onMoveObjectToRef = useRef(onMoveObjectTo);
  onMoveObjectToRef.current = onMoveObjectTo;

  // Ground raycasting plane (infinite mathematical plane at Y = 0)
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Imperative handle for image export and camera presets
  useImperativeHandle(ref, () => ({
    captureSnapshot: (aspectRatio: 'standard' | 'square' | 'vertical') => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return null;

      // Temporarily hide UI cursors and selection indicator during photo capture
      if (selectionIndicatorRef.current) selectionIndicatorRef.current.visible = false;
      if (placementCursorRef.current) placementCursorRef.current.visible = false;

      // Force high-res render for pristine capture
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');

      // Restore indicators
      if (selectionIndicatorRef.current) selectionIndicatorRef.current.visible = !!selectedObjectIdRef.current;
      if (placementCursorRef.current) placementCursorRef.current.visible = !!placementAssetTypeRef.current || isMovingSelectedRef.current;

      return dataUrl;
    },
    resetCamera: () => {
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(0, 15, 26);
        controlsRef.current.target.set(0, 1.5, 0);
        controlsRef.current.update();
      }
    },
    setCinematicAngle: (angle: 'overview' | 'close' | 'top') => {
      if (!cameraRef.current || !controlsRef.current) return;
      if (angle === 'overview') {
        cameraRef.current.position.set(0, 18, 28);
        controlsRef.current.target.set(0, 1.5, 0);
      } else if (angle === 'close') {
        cameraRef.current.position.set(4, 3.5, 7);
        controlsRef.current.target.set(0, 1.5, 0);
      } else if (angle === 'top') {
        cameraRef.current.position.set(0, 32, 0.5);
        controlsRef.current.target.set(0, 0, 0);
      }
      controlsRef.current.update();
    },
    triggerSantaAnimation: (onComplete?: () => void): SantaAnimType => {
      if (santaSystemRef.current) {
        return santaSystemRef.current.triggerNextAnimation(onComplete);
      }
      return 'sky';
    },
  }));

  // Setup WebGL Scene Lifecycle
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isIOSDevice =
      typeof navigator !== 'undefined' &&
      (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // 1. Detect software WebGL guard
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. WebGLRenderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true, // Needed for PNG canvas export!
      });
    } catch (err) {
      console.error('[WorldCanvas] WebGL initialization failed:', err);
      setWebglError('3D graphics could not start on this browser. Please reload the page or enable WebGL.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const initW = Math.max(1, container.clientWidth);
    const initH = Math.max(1, container.clientHeight);
    renderer.setSize(initW, initH);

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, initW / initH, 0.5, 200);
    camera.position.set(0, 16, 26);
    cameraRef.current = camera;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Never dip below snowy floor
    controls.minDistance = 6;
    controls.maxDistance = 50;
    controls.target.set(0, 1.5, 0);
    controlsRef.current = controls;

    // 5. Sky, Lighting & RoomEnvironment
    const sky = new SkyAndLighting(scene, renderer, isSoftwareGl, isIOSDevice);
    skyRef.current = sky;

    // 6. Base Snowy Terrain
    const baseTerrain = createSnowTerrain();
    scene.add(baseTerrain);

    // 7. Dynamic Landscape Group
    const landscapeGroup = new THREE.Group();
    landscapeGroup.name = 'LandscapeContainer';
    scene.add(landscapeGroup);
    landscapeGroupRef.current = landscapeGroup;

    // 8. Placed Objects Group
    const placedGroup = new THREE.Group();
    placedGroup.name = 'PlacedObjectsContainer';
    scene.add(placedGroup);
    placedObjectsGroupRef.current = placedGroup;

    // 9. Snowfall Particles
    const snowfall = new SnowfallSystem(isSoftwareGl ? 400 : 900);
    if (snowfall.points) {
      scene.add(snowfall.points);
    }
    snowfallRef.current = snowfall;

    // 9b. Santa Sleigh & Reindeer Flying Animation System
    const santaSystem = new SantaAnimationSystem(scene);
    santaSystemRef.current = santaSystem;

    // 10. Selection Indicator Ring
    const selGroup = new THREE.Group();
    selGroup.name = 'SelectionIndicator';
    const ringGeo = new THREE.RingGeometry(1.4, 1.55, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe5c783,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    ringMat.userData.isDisposableMaterial = true;
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.04;
    selGroup.add(ringMesh);

    // 4 Gold accent brackets around selection
    for (let b = 0; b < 4; b++) {
      const bracketGeo = new THREE.BoxGeometry(0.3, 0.06, 0.08);
      const bracket = new THREE.Mesh(bracketGeo, ringMat);
      const angle = (b * Math.PI) / 2;
      bracket.position.set(Math.cos(angle) * 1.5, 0.05, Math.sin(angle) * 1.5);
      bracket.rotation.y = -angle;
      selGroup.add(bracket);
    }
    selGroup.visible = false;
    scene.add(selGroup);
    selectionIndicatorRef.current = selGroup;

    // 11. Placement Cursor Preview Group (with 3D ghost preview)
    const cursorGroup = new THREE.Group();
    cursorGroup.name = 'PlacementCursor';
    const cursorRingGeo = new THREE.RingGeometry(0.7, 0.85, 32);
    cursorRingGeo.rotateX(-Math.PI / 2);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    cursorMat.userData.isDisposableMaterial = true;
    const cursorRing = new THREE.Mesh(cursorRingGeo, cursorMat);
    cursorRing.position.y = 0.05;
    cursorGroup.add(cursorRing);

    // Ghost object container
    const ghostContainer = new THREE.Group();
    ghostContainer.name = 'GhostContainer';
    cursorGroup.add(ghostContainer);

    cursorGroup.visible = false;
    scene.add(cursorGroup);
    placementCursorRef.current = cursorGroup;

    // Animation & Render Loop (pauses cleanly when backgrounded or WebGL context is lost)
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;
    let isContextLost = false;

    const tick = () => {
      if (isDisposed || isContextLost || document.hidden) {
        frameId = 0;
        return;
      }
      const delta = Math.min(clock.getDelta(), 0.1);

      if (controls.enabled) {
        controls.update();
      }

      // Rotate selection indicator slowly for a magical holiday glow
      if (selGroup.visible) {
        selGroup.rotation.y += delta * 0.5;
      }

      // Pulse placement ring gently
      if (cursorGroup.visible) {
        const pulse = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.08;
        cursorRing.scale.set(pulse, 1, pulse);
      }

      // Update snowfall particles
      if (snowfall) {
        snowfall.update(delta);
      }

      // Update Santa Sleigh & Reindeer Flying Animation System
      if (santaSystem) {
        santaSystem.update(delta);
      }

      // Animate 3D assets (Ferris wheel, roller coaster, carousel, train, etc.)
      const elapsedTime = clock.getElapsedTime();
      if (placedGroup) {
        placedGroup.traverse((child) => {
          if (child.userData && typeof child.userData.onUpdate === 'function') {
            child.userData.onUpdate(elapsedTime, delta);
          }
        });
      }
      if (landscapeGroup) {
        landscapeGroup.traverse((child) => {
          if (child.userData && typeof child.userData.onUpdate === 'function') {
            child.userData.onUpdate(elapsedTime, delta);
          }
        });
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (isDisposed || isContextLost || document.hidden) return;
      if (frameId === 0) {
        clock.getDelta();
        frameId = requestAnimationFrame(tick);
      }
    };

    startLoop();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (frameId !== 0) {
          cancelAnimationFrame(frameId);
          frameId = 0;
        }
      } else {
        startLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Window & Container Resize Handler (handles iOS Safari toolbar collapse & rotation)
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    // WebGL Context Loss & Restore Recovery (critical for iOS Safari memory pressure)
    const dom = renderer.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      isContextLost = true;
      setContextLost(true);
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };
    const handleContextRestored = () => {
      isContextLost = false;
      setContextLost(false);
      handleResize();
      startLoop();
    };
    dom.addEventListener('webglcontextlost', handleContextLost);
    dom.addEventListener('webglcontextrestored', handleContextRestored);

    // Pointer Events for Placement, Precision Dragging, Selection & iOS Multi-Touch Arbitration
    const activePointers = new Map<number, { x: number; y: number }>();
    let primaryPointerId: number | null = null;
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;
    let candidateObjectId: string | null = null;
    let isDraggingSelectedMesh = false;
    let draggedObjectId: string | null = null;

    const resetDraggedMeshPreviewPosition = (objectId: string | null) => {
      if (!objectId || !placedObjectsGroupRef.current) return;
      const committed = placedObjectsRef.current.find((o) => o.id === objectId);
      const mesh = placedObjectsGroupRef.current.children.find(
        (c) => c.userData.placedId === objectId
      );
      if (committed && mesh) {
        mesh.position.set(committed.position[0] || 0, committed.position[1] || 0, committed.position[2] || 0);
        if (selectionIndicatorRef.current) {
          selectionIndicatorRef.current.position.set(committed.position[0] || 0, 0.02, committed.position[2] || 0);
        }
      }
    };

    const restoreOrbitControls = () => {
      if (controlsRef.current) {
        const allowOrbit = !placementAssetTypeRef.current && !isMovingSelectedRef.current;
        controlsRef.current.enabled = allowOrbit;
        controlsRef.current.enableRotate = allowOrbit;
        controlsRef.current.enableZoom = allowOrbit;
        controlsRef.current.enablePan = allowOrbit;
        controlsRef.current.update();
      }
    };

    const updateMouseCoords = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      mouse.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Multi-touch gesture started (e.g. 2-finger pinch zoom or pan on iPhone):
      // Abort single-finger selection/drag cleanly so OrbitControls handles zoom/pan unblocked.
      if (activePointers.size > 1) {
        if (isDraggingSelectedMesh && draggedObjectId) {
          resetDraggedMeshPreviewPosition(draggedObjectId);
        }
        primaryPointerId = null;
        isDraggingSelectedMesh = false;
        draggedObjectId = null;
        draggedPosRef.current = null;
        candidateObjectId = null;
        if (cursorGroup && !placementAssetTypeRef.current && !isMovingSelectedRef.current) {
          cursorGroup.visible = false;
        }
        restoreOrbitControls();
        return;
      }

      primaryPointerId = e.pointerId;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
      isDraggingSelectedMesh = false;
      draggedObjectId = null;
      candidateObjectId = null;

      updateMouseCoords(e.clientX, e.clientY);
      raycaster.current.setFromCamera(mouse.current, camera);

      // Case 1: Actively placing new asset
      if (placementAssetTypeRef.current) {
        controls.enabled = false;
        controls.enableRotate = false;
        return;
      }

      // Case 2: Explicit HUD Move Mode
      if (isMovingSelectedRef.current && selectedObjectIdRef.current) {
        controls.enabled = false;
        controls.enableRotate = false;
        isDraggingSelectedMesh = true;
        draggedObjectId = selectedObjectIdRef.current;
        return;
      }

      // Case 3: Normal mode -> Detect object under pointer for potential drag or selection
      if (placedObjectsGroupRef.current) {
        const intersects = raycaster.current.intersectObjects(
          placedObjectsGroupRef.current.children,
          true
        );
        if (intersects.length > 0) {
          let cur: THREE.Object3D | null = intersects[0].object;
          while (cur && cur.parent !== placedObjectsGroupRef.current) {
            cur = cur.parent;
          }
          if (cur && cur.userData.placedId) {
            candidateObjectId = cur.userData.placedId;
          }
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Ignore move events while a multi-touch pinch/pan gesture is active or from secondary pointers
      if (activePointers.size > 1) return;
      if (primaryPointerId !== null && e.pointerId !== primaryPointerId) return;

      updateMouseCoords(e.clientX, e.clientY);

      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      const moveDist = Math.hypot(dx, dy);

      // Activate drag mode if user moves pointer beyond 6px over a candidate object
      if (
        primaryPointerId !== null &&
        !isDraggingSelectedMesh &&
        candidateObjectId &&
        moveDist > 6 &&
        !placementAssetTypeRef.current
      ) {
        isDraggingSelectedMesh = true;
        draggedObjectId = candidateObjectId;
        controls.enabled = false;
        controls.enableRotate = false;
        onSelectObjectRef.current(candidateObjectId);
      }

      // Case A: Real-time Object Dragging along snowy ground plane
      if (isDraggingSelectedMesh && draggedObjectId && placedObjectsGroupRef.current) {
        raycaster.current.setFromCamera(mouse.current, camera);
        const hit = new THREE.Vector3();
        if (raycaster.current.ray.intersectPlane(groundPlane.current, hit)) {
          const clampedX = Math.max(-23.5, Math.min(23.5, hit.x));
          const clampedZ = Math.max(-23.5, Math.min(23.5, hit.z));

          draggedPosRef.current = { id: draggedObjectId, pos: [clampedX, clampedZ] };

          const targetMesh = placedObjectsGroupRef.current.children.find(
            (c) => c.userData.placedId === draggedObjectId
          );
          if (targetMesh) {
            targetMesh.position.set(clampedX, targetMesh.position.y, clampedZ);
          }
          if (selectionIndicatorRef.current) {
            selectionIndicatorRef.current.position.set(clampedX, 0.02, clampedZ);
            selectionIndicatorRef.current.visible = true;
          }
          if (cursorGroup) {
            cursorGroup.position.set(clampedX, 0, clampedZ);
            cursorGroup.visible = true;
          }
        }
        return;
      }

      // Case B: Cursor Preview during Placement or Move
      if (placementAssetTypeRef.current || isMovingSelectedRef.current) {
        raycaster.current.setFromCamera(mouse.current, camera);
        const intersectPoint = new THREE.Vector3();
        if (raycaster.current.ray.intersectPlane(groundPlane.current, intersectPoint)) {
          if (cursorGroup) {
            cursorGroup.position.set(intersectPoint.x, 0, intersectPoint.z);
            cursorGroup.visible = true;
            const dist = Math.hypot(intersectPoint.x, intersectPoint.z);
            if (dist > 23.5) {
              cursorMat.color.setHex(0xef4444);
            } else {
              cursorMat.color.setHex(0x38bdf8);
            }
          }
        }
      } else {
        if (cursorGroup) cursorGroup.visible = false;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);

      // If multi-touch cancelled primary interaction, wait until all fingers lift and restore controls
      if (primaryPointerId !== e.pointerId) {
        if (activePointers.size === 0) {
          restoreOrbitControls();
        }
        return;
      }

      primaryPointerId = null;

      updateMouseCoords(e.clientX, e.clientY);
      raycaster.current.setFromCamera(mouse.current, camera);

      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownTime;
      const isTap = dx <= 12 && dy <= 12 && elapsed < 600;

      // 1. Commit Active Drag Movement
      if (isDraggingSelectedMesh && draggedObjectId) {
        const hit = new THREE.Vector3();
        if (raycaster.current.ray.intersectPlane(groundPlane.current, hit)) {
          const clampedX = Math.max(-23.5, Math.min(23.5, hit.x));
          const clampedZ = Math.max(-23.5, Math.min(23.5, hit.z));
          soundEngine.playPlacement();
          onMoveObjectToRef.current(draggedObjectId, [clampedX, 0, clampedZ]);
        }
        isDraggingSelectedMesh = false;
        draggedObjectId = null;
        draggedPosRef.current = null;
        candidateObjectId = null;
        if (cursorGroup && !placementAssetTypeRef.current && !isMovingSelectedRef.current) {
          cursorGroup.visible = false;
        }
        restoreOrbitControls();
        return;
      }

      // 2. Commit Placement (New Asset) - works on tap OR release anywhere on ground!
      if (placementAssetTypeRef.current) {
        const hit = new THREE.Vector3();
        if (raycaster.current.ray.intersectPlane(groundPlane.current, hit)) {
          const clampedX = Math.max(-23.5, Math.min(23.5, hit.x));
          const clampedZ = Math.max(-23.5, Math.min(23.5, hit.z));
          soundEngine.playPlacement();
          onPlaceObjectAtRef.current([clampedX, 0, clampedZ], placementAssetTypeRef.current);
        }
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
          controlsRef.current.enableRotate = true;
          controlsRef.current.update();
        }
        return;
      }

      // 3. Commit Move in explicit HUD Move Mode
      if (isMovingSelectedRef.current && selectedObjectIdRef.current) {
        const hit = new THREE.Vector3();
        if (raycaster.current.ray.intersectPlane(groundPlane.current, hit)) {
          const clampedX = Math.max(-23.5, Math.min(23.5, hit.x));
          const clampedZ = Math.max(-23.5, Math.min(23.5, hit.z));
          soundEngine.playPlacement();
          onMoveObjectToRef.current(selectedObjectIdRef.current, [clampedX, 0, clampedZ]);
        }
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
          controlsRef.current.enableRotate = true;
          controlsRef.current.update();
        }
        return;
      }

      // 4. Tap Selection / Deselection
      if (isTap) {
        if (candidateObjectId) {
          soundEngine.playClick();
          onSelectObjectRef.current(candidateObjectId);
        } else {
          // Tapped empty ground -> deselect
          onSelectObjectRef.current(null);
        }
      }

      candidateObjectId = null;
      isDraggingSelectedMesh = false;
      draggedObjectId = null;
      draggedPosRef.current = null;

      // Always restore 360 Orbit Controls
      restoreOrbitControls();
    };

    const handlePointerCancel = (e?: PointerEvent) => {
      if (e) {
        activePointers.delete(e.pointerId);
      } else {
        activePointers.clear();
      }
      if (isDraggingSelectedMesh && draggedObjectId) {
        resetDraggedMeshPreviewPosition(draggedObjectId);
      }
      primaryPointerId = null;
      isDraggingSelectedMesh = false;
      draggedObjectId = null;
      draggedPosRef.current = null;
      candidateObjectId = null;
      if (cursorGroup && !placementAssetTypeRef.current && !isMovingSelectedRef.current) {
        cursorGroup.visible = false;
      }
      restoreOrbitControls();
    };

    const handleWindowBlur = () => {
      activePointers.clear();
      handlePointerCancel();
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointercancel', handlePointerCancel);
    dom.addEventListener('lostpointercapture', handlePointerCancel);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      isDisposed = true;
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('blur', handleWindowBlur);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      dom.removeEventListener('webglcontextlost', handleContextLost);
      dom.removeEventListener('webglcontextrestored', handleContextRestored);
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('pointercancel', handlePointerCancel);
      dom.removeEventListener('lostpointercapture', handlePointerCancel);

      disposeObjectTree(baseTerrain);
      disposeObjectTree(landscapeGroup);
      disposeObjectTree(placedGroup);
      disposeObjectTree(selGroup);
      disposeObjectTree(cursorGroup);

      controls.dispose();
      sky.dispose();
      snowfall.dispose();
      santaSystem.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync OrbitControls enabled & enableRotate states with active modes
  useEffect(() => {
    if (controlsRef.current) {
      if (placementAssetType || isMovingSelected) {
        controlsRef.current.enabled = false;
        controlsRef.current.enableRotate = false;
      } else {
        controlsRef.current.enabled = true;
        controlsRef.current.enableRotate = true;
        controlsRef.current.enableZoom = true;
        controlsRef.current.enablePan = true;
        controlsRef.current.update();
      }
    }
  }, [placementAssetType, isMovingSelected]);

  // Update Landscape Scenery & reset OrbitControls for full 360 rotation
  useEffect(() => {
    const parent = landscapeGroupRef.current;
    if (!parent) return;

    // Clear & dispose old landscape GPU geometries
    while (parent.children.length > 0) {
      const child = parent.children[0];
      parent.remove(child);
      disposeObjectTree(child);
    }

    // Generate selected landscape
    const newLandscape = generateLandscape(landscapeType);
    parent.add(newLandscape);

    // Re-enable 360° OrbitControls completely whenever switching landscapes!
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
      controlsRef.current.enableRotate = true;
      controlsRef.current.enableZoom = true;
      controlsRef.current.enablePan = true;
      controlsRef.current.target.set(0, 1.5, 0);
      controlsRef.current.update();
    }
  }, [landscapeType]);

  // Update Placed Objects Group
  useEffect(() => {
    const parent = placedObjectsGroupRef.current;
    if (!parent) return;

    // Clear & dispose old meshes
    while (parent.children.length > 0) {
      const child = parent.children[0];
      parent.remove(child);
      disposeObjectTree(child);
    }

    // Rebuild placed objects from state
    const safeObjects = Array.isArray(placedObjects) ? placedObjects : [];
    safeObjects.forEach((obj) => {
      if (!obj || !obj.assetType) return;
      const meshGroup = createAssetObject(obj.assetType, obj.colorVariant);
      const isBeingDragged = draggedPosRef.current && draggedPosRef.current.id === obj.id;
      const posX = isBeingDragged ? draggedPosRef.current!.pos[0] : (obj.position[0] || 0);
      const posZ = isBeingDragged ? draggedPosRef.current!.pos[1] : (obj.position[2] || 0);
      meshGroup.position.set(posX, obj.position[1] || 0, posZ);
      meshGroup.rotation.set(obj.rotation[0] || 0, obj.rotation[1] || 0, obj.rotation[2] || 0);
      meshGroup.scale.set(obj.scale[0] || 1, obj.scale[1] || 1, obj.scale[2] || 1);
      meshGroup.userData = { ...meshGroup.userData, placedId: obj.id, assetType: obj.assetType };
      parent.add(meshGroup);
    });

    // Update lights immediately for night/day without rebuilding geometries on timeOfDay change
    skyRef.current?.updateSceneLightEmitters(timeOfDayRef.current);
  }, [placedObjects]);

  // Update Selection Indicator position
  useEffect(() => {
    const selIndicator = selectionIndicatorRef.current;
    if (!selIndicator) return;

    if (!selectedObjectId) {
      selIndicator.visible = false;
      return;
    }

    const targetObj = placedObjects.find((o) => o.id === selectedObjectId);
    if (targetObj) {
      selIndicator.position.set(targetObj.position[0], 0.02, targetObj.position[2]);
      // Scale indicator slightly according to object size
      const maxScale = Math.max(targetObj.scale[0], targetObj.scale[2]);
      selIndicator.scale.set(maxScale, 1, maxScale);
      selIndicator.visible = true;
    } else {
      selIndicator.visible = false;
    }
  }, [selectedObjectId, placedObjects]);

  // Update Time of Day / Atmosphere
  useEffect(() => {
    if (skyRef.current) {
      skyRef.current.applyTimeOfDay(timeOfDay);
    }
  }, [timeOfDay]);

  // Update Ghost Object in Placement Cursor
  useEffect(() => {
    const cursor = placementCursorRef.current;
    if (!cursor) return;

    const ghostContainer = cursor.getObjectByName('GhostContainer');
    if (!ghostContainer) return;

    // Clear & dispose old ghost
    while (ghostContainer.children.length > 0) {
      const child = ghostContainer.children[0];
      ghostContainer.remove(child);
      disposeObjectTree(child);
    }

    if (placementAssetType) {
      const ghostMesh = createAssetObject(placementAssetType);
      ghostMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material.clone() as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = 0.65;
          mat.userData.isDisposableMaterial = true;
          child.material = mat;
        }
      });
      ghostContainer.add(ghostMesh);
    }
  }, [placementAssetType]);

  // Update Snowfall Density
  useEffect(() => {
    if (snowfallRef.current) {
      snowfallRef.current.setVisible(snowfallDensity !== 'off');
    }
  }, [snowfallDensity]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing canvas-touch-lock"
    >
      {(webglError || contextLost) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-[#0d1723]/95 text-center">
          <div className="max-w-sm rounded-2xl winter-panel-gold p-5 text-xs text-[#edf2f6] space-y-2">
            <div className="text-base font-bold font-serif-display text-[#e5c783]">
              {webglError ? '3D Graphics Unavailable' : 'Restoring 3D Scene...'}
            </div>
            <p className="text-[#91a1b1] leading-relaxed">
              {webglError ||
                'Your browser paused 3D graphics to free memory. Returning to the scene automatically.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
