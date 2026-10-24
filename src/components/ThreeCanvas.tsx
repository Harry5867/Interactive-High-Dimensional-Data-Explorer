import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DataPoint, ColorMode } from '../types';
import {
  RotateCcw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Camera,
  Layers,
  Compass,
  Palette,
} from 'lucide-react';

interface ThreeCanvasProps {
  dataPoints: DataPoint[];
  colorMode: ColorMode;
  selectedFeature?: string;
  onSelectPoint: (point: DataPoint | null) => void;
  selectedPoint: DataPoint | null;
  reductionMethod: string;
  // Dual Viewport Synchronization
  onCameraChange?: (camPos: THREE.Vector3, targetPos: THREE.Vector3) => void;
  syncCameraPos?: THREE.Vector3 | null;
  syncTargetPos?: THREE.Vector3 | null;
  titleBadge?: string;
  // Centroid visualizer toggle
  showCentroids?: boolean;
  // PCA Biplot feature vectors
  pcaComponents?: number[][];
  featureNames?: string[];
  showBiplot?: boolean;
  biplotTopK?: number;
  biplotScale?: number;
  onToggleBiplot?: () => void;
}

const CLUSTER_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#e11d48', // Rose
  '#84cc16', // Lime
];

const GROUND_TRUTH_COLORS: Record<string, string> = {
  'M': '#f43f5e',
  'B': '#10b981',
  '1': '#f43f5e',
  '0': '#10b981',
};

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  dataPoints,
  colorMode,
  selectedFeature,
  onSelectPoint,
  selectedPoint,
  reductionMethod,
  onCameraChange,
  syncCameraPos,
  syncTargetPos,
  titleBadge,
  showCentroids = true,
  pcaComponents,
  featureNames,
  showBiplot = false,
  biplotTopK = 6,
  biplotScale = 30,
  onToggleBiplot,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [pointScale, setPointScale] = useState(1.4);
  const [isHoverPointScale, setIsHoverPointScale] = useState(false);
  const [centroidsVisible, setCentroidsVisible] = useState(showCentroids);
  const [biplotVisible, setBiplotVisible] = useState(showBiplot);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);

  // Sync external showBiplot prop changes
  useEffect(() => {
    if (showBiplot !== undefined) {
      setBiplotVisible(showBiplot);
    }
  }, [showBiplot]);

  // Persistent Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const centroidGroupRef = useRef<THREE.Group | null>(null);
  const biplotGroupRef = useRef<THREE.Group | null>(null);

  // Normalize points to fit inside [-38, 38] box
  const normalizedPoints = useMemo(() => {
    if (dataPoints.length === 0) return [];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const p of dataPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const rangeZ = maxZ - minZ || 1;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const midZ = (minZ + maxZ) / 2;

    const scale = 72 / maxRange;

    return dataPoints.map(p => ({
      ...p,
      normX: (p.x - midX) * scale,
      normY: (p.y - midY) * scale,
      normZ: (p.z - midZ) * scale,
    }));
  }, [dataPoints]);

  const pointsRef = useRef(normalizedPoints);
  useEffect(() => {
    pointsRef.current = normalizedPoints;
  }, [normalizedPoints]);

  // 1. ONE-TIME INITIALIZATION OF SCENE, CAMERA, RENDERER & ORBIT CONTROLS
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.005);
    sceneRef.current = scene;

    // Centroid Group
    const centroidGroup = new THREE.Group();
    scene.add(centroidGroup);
    centroidGroupRef.current = centroidGroup;

    // Biplot Feature Vectors Group
    const biplotGroup = new THREE.Group();
    scene.add(biplotGroup);
    biplotGroupRef.current = biplotGroup;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(70, 50, 85);
    cameraRef.current = camera;

    // WebGL Renderer with preserveDrawingBuffer for crystal-clear snapshots
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.0;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.maxDistance = 280;
    controls.minDistance = 15;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.5;

    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    controlsRef.current = controls;

    if (onCameraChange) {
      controls.addEventListener('change', () => {
        onCameraChange(camera.position, controls.target);
      });
    }

    controls.addEventListener('start', () => {
      renderer.domElement.style.cursor = 'grabbing';
    });
    controls.addEventListener('end', () => {
      renderer.domElement.style.cursor = 'grab';
    });

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x6366f1, 2.0);
    dirLight1.position.set(60, 80, 60);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 1.4);
    dirLight2.position.set(-60, -40, -60);
    scene.add(dirLight2);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(80, 20, 0x4338ca, 0x1e293b);
    gridHelper.position.y = -38;
    scene.add(gridHelper);

    // 3D Axes
    const axesHelper = new THREE.AxesHelper(40);
    axesHelper.position.set(-38, -38, -38);
    scene.add(axesHelper);

    // Bounding Box
    const boxGeo = new THREE.BoxGeometry(76, 76, 76);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x334155,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    scene.add(new THREE.Mesh(boxGeo, boxMat));

    // Pointer Events for Raycasting (Hover / Click)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 6) {
        updatePointer(e.clientX, e.clientY);
        const mesh = instancedMeshRef.current;
        if (!mesh) return;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(mesh);

        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
          const idx = intersects[0].instanceId;
          const pt = pointsRef.current[idx];
          if (pt) onSelectPoint(pt);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY);
      const mesh = instancedMeshRef.current;
      if (!mesh) return;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(mesh);

      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const idx = intersects[0].instanceId;
        const pt = pointsRef.current[idx];
        setHoveredPoint(pt || null);
        setTooltipPos({ x: e.clientX, y: e.clientY });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredPoint(null);
        setTooltipPos(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointermove', handlePointerMove);

    // KEYBOARD NAVIGATION
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 0.15;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        rotateKeyboard(-step, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rotateKeyboard(step, 0);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        rotateKeyboard(0, -step);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        rotateKeyboard(0, step);
      } else if (e.key === '+' || e.key === '=') {
        camera.position.multiplyScalar(0.85);
        controls.update();
      } else if (e.key === '-' || e.key === '_') {
        camera.position.multiplyScalar(1.18);
        controls.update();
      }
    };

    const rotateKeyboard = (angleX: number, angleY: number) => {
      const offset = camera.position.clone().sub(controls.target);
      const radius = offset.length();
      let theta = Math.atan2(offset.x, offset.z);
      let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

      theta += angleX;
      phi = Math.max(0.05, Math.min(Math.PI - 0.05, phi + angleY));

      offset.x = radius * Math.sin(phi) * Math.sin(theta);
      offset.y = radius * Math.cos(phi);
      offset.z = radius * Math.sin(phi) * Math.cos(theta);

      camera.position.copy(controls.target).add(offset);
      controls.update();
    };

    window.addEventListener('keydown', handleKeyDown);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Pulsing and rotating centroid rings
      if (centroidGroupRef.current) {
        centroidGroupRef.current.children.forEach((child, i) => {
          child.rotation.y = time * 0.8 + i;
          child.rotation.x = time * 0.5;
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animId);
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, [onSelectPoint, onCameraChange]);

  // 2. DUAL VIEWPORT CAMERA SYNC
  useEffect(() => {
    if (syncCameraPos && syncTargetPos && cameraRef.current && controlsRef.current) {
      cameraRef.current.position.copy(syncCameraPos);
      controlsRef.current.target.copy(syncTargetPos);
      controlsRef.current.update();
    }
  }, [syncCameraPos, syncTargetPos]);

  // 3. AUTO-ROTATE TOGGLE
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating]);

  // 4. UPDATE INSTANCED MESH & CENTROIDS
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (instancedMeshRef.current) {
      scene.remove(instancedMeshRef.current);
      instancedMeshRef.current.geometry.dispose();
      (instancedMeshRef.current.material as THREE.Material).dispose();
      instancedMeshRef.current = null;
    }

    // Clear centroids
    if (centroidGroupRef.current) {
      while (centroidGroupRef.current.children.length > 0) {
        const obj = centroidGroupRef.current.children[0];
        centroidGroupRef.current.remove(obj);
      }
    }

    const count = normalizedPoints.length;
    if (count === 0) return;

    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.4,
    });

    const mesh = new THREE.InstancedMesh(sphereGeo, sphereMat, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    let fMin = Infinity, fMax = -Infinity;
    if (colorMode === 'feature' && selectedFeature) {
      for (const p of dataPoints) {
        const val = p.originalFeatures[selectedFeature];
        if (val !== undefined) {
          if (val < fMin) fMin = val;
          if (val > fMax) fMax = val;
        }
      }
    }
    const fRange = fMax - fMin || 1;

    // Cluster Centroids accumulator
    const clusterCentroids: Record<number, { sumX: number; sumY: number; sumZ: number; count: number }> = {};

    for (let i = 0; i < count; i++) {
      const p = normalizedPoints[i];
      dummy.position.set(p.normX, p.normY, p.normZ);

      const isSelected = selectedPoint && selectedPoint.id === p.id;
      const s = (isSelected ? 2.5 : 1.0) * pointScale;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Accumulate for centroid
      if (p.cluster >= 0) {
        if (!clusterCentroids[p.cluster]) {
          clusterCentroids[p.cluster] = { sumX: 0, sumY: 0, sumZ: 0, count: 0 };
        }
        clusterCentroids[p.cluster].sumX += p.normX;
        clusterCentroids[p.cluster].sumY += p.normY;
        clusterCentroids[p.cluster].sumZ += p.normZ;
        clusterCentroids[p.cluster].count += 1;
      }

      if (colorMode === 'cluster') {
        if (p.cluster === -1) {
          color.set('#64748b');
        } else {
          color.set(CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length]);
        }
      } else if (colorMode === 'ground-truth') {
        const lbl = String(p.label ?? '');
        color.set(GROUND_TRUTH_COLORS[lbl] || CLUSTER_COLORS[Math.abs(hashString(lbl)) % CLUSTER_COLORS.length]);
      } else if (colorMode === 'feature' && selectedFeature) {
        const val = p.originalFeatures[selectedFeature] ?? fMin;
        const ratio = Math.max(0, Math.min(1, (val - fMin) / fRange));
        color.setHSL(0.7 - ratio * 0.7, 0.9, 0.55);
      }

      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    instancedMeshRef.current = mesh;

    // Render 3D Centroid Pulsing Rings
    if (centroidsVisible && centroidGroupRef.current && (colorMode === 'cluster' || colorMode === 'ground-truth')) {
      Object.entries(clusterCentroids).forEach(([cIdStr, cData]) => {
        if (cData.count === 0) return;
        const cId = parseInt(cIdStr);
        const cx = cData.sumX / cData.count;
        const cy = cData.sumY / cData.count;
        const cz = cData.sumZ / cData.count;

        const cColor = CLUSTER_COLORS[cId % CLUSTER_COLORS.length];

        // Glowing Core Sphere
        const coreGeo = new THREE.SphereGeometry(2.0, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(cColor),
          wireframe: true,
          transparent: true,
          opacity: 0.85,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.set(cx, cy, cz);

        // Surrounding Pulsing Torus Ring
        const ringGeo = new THREE.TorusGeometry(5.0, 0.25, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(cColor),
          transparent: true,
          opacity: 0.6,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(cx, cy, cz);

        centroidGroupRef.current!.add(coreMesh);
        centroidGroupRef.current!.add(ringMesh);
      });
    }
  }, [normalizedPoints, colorMode, selectedFeature, selectedPoint, pointScale, centroidsVisible, dataPoints]);

  // 4. RENDER PCA 3D FEATURE LOADING VECTORS (BIPLOT)
  useEffect(() => {
    if (!biplotGroupRef.current) return;

    // Clear old biplot objects
    while (biplotGroupRef.current.children.length > 0) {
      const obj = biplotGroupRef.current.children[0];
      biplotGroupRef.current.remove(obj);
    }

    if (!biplotVisible || reductionMethod !== 'PCA' || !pcaComponents || !featureNames || pcaComponents.length < 3) {
      return;
    }

    const d = featureNames.length;
    const v1 = pcaComponents[0];
    const v2 = pcaComponents[1];
    const v3 = pcaComponents[2];

    if (!v1 || !v2 || !v3) return;

    // Calculate magnitude of each feature loading vector
    const featureMagnitudes: { name: string; x: number; y: number; z: number; mag: number }[] = [];
    for (let j = 0; j < d; j++) {
      const x = v1[j] || 0;
      const y = v2[j] || 0;
      const z = v3[j] || 0;
      const mag = Math.hypot(x, y, z);
      featureMagnitudes.push({ name: featureNames[j], x, y, z, mag });
    }

    // Pick top K most influential features
    featureMagnitudes.sort((a, b) => b.mag - a.mag);
    const topFeatures = featureMagnitudes.slice(0, biplotTopK);

    const vectorScale = biplotScale;

    topFeatures.forEach((feat) => {
      const dir = new THREE.Vector3(feat.x, feat.y, feat.z).normalize();
      const origin = new THREE.Vector3(0, 0, 0);

      // Arrow Helper with vibrant pink
      const arrowHelper = new THREE.ArrowHelper(dir, origin, vectorScale, 0xf43f5e, 3.5, 1.6);
      biplotGroupRef.current!.add(arrowHelper);

      // Billboard Text Sprite
      const sprite = createTextLabelSprite(feat.name, '#f43f5e');
      sprite.position.copy(dir).multiplyScalar(vectorScale + 5);
      biplotGroupRef.current!.add(sprite);
    });
  }, [biplotVisible, reductionMethod, pcaComponents, featureNames, biplotTopK, biplotScale]);

  const handleResetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(70, 50, 85);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleZoom = (inOut: 'in' | 'out') => {
    if (cameraRef.current && controlsRef.current) {
      const factor = inOut === 'in' ? 0.75 : 1.3;
      cameraRef.current.position.multiplyScalar(factor);
      controlsRef.current.update();
    }
  };

  // High-Resolution 4K Snapshot Capture
  const handleTakeSnapshot = () => {
    if (!rendererRef.current) return;
    try {
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `3d_explorer_${reductionMethod.toLowerCase()}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e: any) {
      alert('Không thể chụp ảnh: ' + e.message);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ touchAction: 'none' }}>
      {/* 3D Canvas Mount Point */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* 3D Viewport Title Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 shadow-xl pointer-events-auto">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-bold text-slate-100 tracking-wider">
          {titleBadge || `KHÔNG GIAN 3D (${reductionMethod})`}
        </span>
        <span className="text-xs text-slate-500">|</span>
        <span className="text-xs text-indigo-300 font-mono font-medium">
          {dataPoints.length} mẫu
        </span>
      </div>

      {/* Floating View Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-xl pointer-events-auto">
        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          title={isAutoRotating ? 'Tạm dừng tự động xoay' : 'Bật tự động xoay 360°'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isAutoRotating
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
          <span>{isAutoRotating ? 'Dừng xoay' : 'Tự xoay 360°'}</span>
        </button>

        {/* Toggle 3D Centroids Rings */}
        <button
          onClick={() => setCentroidsVisible(!centroidsVisible)}
          title={centroidsVisible ? 'Ẩn tâm cụm 3D phát sáng' : 'Hiện tâm cụm 3D phát sáng'}
          className={`p-1.5 rounded-lg transition-all ${
            centroidsVisible ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Layers size={15} />
        </button>

        {/* Toggle PCA Biplot Vectors */}
        {reductionMethod === 'PCA' && (
          <button
            onClick={() => {
              if (onToggleBiplot) onToggleBiplot();
              else setBiplotVisible(!biplotVisible);
            }}
            title={biplotVisible ? 'Ẩn véc-tơ đặc trưng 3D (PCA Biplot)' : 'Hiện véc-tơ đặc trưng 3D (PCA Biplot)'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              biplotVisible
                ? 'bg-rose-600/80 hover:bg-rose-500 text-white shadow shadow-rose-600/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Compass size={14} />
            <span>Biplot</span>
          </button>
        )}

        {/* Snapshot High-Res Capture */}
        <button
          onClick={handleTakeSnapshot}
          title="Chụp ảnh 3D phân giải cao (PNG sắc nét cho báo cáo/slide)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow shadow-emerald-700/40"
        >
          <Camera size={14} />
          <span>Chụp 3D</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-700" />

        <button
          onClick={handleResetCamera}
          title="Đặt lại góc nhìn mặc định"
          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <RotateCcw size={15} />
        </button>

        <button
          onClick={() => handleZoom('in')}
          title="Phóng to (+)"
          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <ZoomIn size={15} />
        </button>

        <button
          onClick={() => handleZoom('out')}
          title="Thu nhỏ (-)"
          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <ZoomOut size={15} />
        </button>

        <div className="h-4 w-[1px] bg-slate-700" />

        <div
          className="relative flex items-center gap-2 px-2 text-xs text-slate-300 group"
          onMouseEnter={() => setIsHoverPointScale(true)}
          onMouseLeave={() => setIsHoverPointScale(false)}
        >
          {/* Floating Bubble Tooltip */}
          {isHoverPointScale && (
            <div
              style={{
                left: `${((pointScale - 0.6) / (3.5 - 0.6)) * 64 + 32}px`,
              }}
              className="absolute -top-7 transform -translate-x-1/2 pointer-events-none px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[10px] font-bold shadow-lg border border-indigo-400 whitespace-nowrap animate-fade-in z-30"
            >
              {pointScale.toFixed(1)}x
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-indigo-600" />
            </div>
          )}
          <span className="text-[11px] text-slate-400 font-medium">Cỡ:</span>
          <input
            type="range"
            min="0.6"
            max="3.5"
            step="0.1"
            value={pointScale}
            onChange={(e) => setPointScale(parseFloat(e.target.value))}
            className="w-16 accent-indigo-500 cursor-pointer"
          />
          <span className="font-mono text-indigo-400 font-bold text-[11px] min-w-[28px] text-right">
            {pointScale.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-xl border border-indigo-500/50 shadow-2xl transition-all"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y - 12}px` }}
        >
          <div className="flex items-center justify-between gap-4 font-semibold border-b border-slate-700 pb-1.5 mb-2">
            <span className="text-indigo-400 font-bold">ID: {hoveredPoint.id}</span>
            {hoveredPoint.label !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                hoveredPoint.label === 'M' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                hoveredPoint.label === 'B' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                'bg-slate-700 text-slate-200'
              }`}>
                {hoveredPoint.label === 'M' ? 'Ác tính (M)' : hoveredPoint.label === 'B' ? 'Lành tính (B)' : `Nhãn: ${hoveredPoint.label}`}
              </span>
            )}
          </div>
          <div className="space-y-1 text-slate-300">
            <div>Cụm dự đoán: <strong className="text-amber-400">{hoveredPoint.cluster === -1 ? 'Điểm nhiễu' : `Cụm ${hoveredPoint.cluster}`}</strong></div>
            <div className="font-mono text-[11px] text-slate-400">
              Tọa độ 3D: ({hoveredPoint.x.toFixed(2)}, {hoveredPoint.y.toFixed(2)}, {hoveredPoint.z.toFixed(2)})
            </div>
            {selectedFeature && hoveredPoint.originalFeatures[selectedFeature] !== undefined && (
              <div className="text-indigo-300 font-medium pt-1">
                {selectedFeature}: {hoveredPoint.originalFeatures[selectedFeature]}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Floating Color Legend (Top-Left, below Title Badge - Không bị đè) */}
      <div className="absolute top-16 left-4 z-10 pointer-events-auto bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 text-[11px] transition-all">
        <div 
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
          className="flex items-center justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Palette size={12} className="text-indigo-400" />
            <span>
              {colorMode === 'ground-truth' ? 'Nhãn Y khoa thực tế' : colorMode === 'cluster' ? 'Cụm thuật toán' : 'Thang đo đặc trưng'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 hover:text-slate-300">
            {isLegendExpanded ? '▲' : '▼'}
          </span>
        </div>

        {isLegendExpanded && (
          <div className="pt-1 border-t border-slate-800 flex flex-col gap-1.5">
            {colorMode === 'ground-truth' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow shadow-rose-500/50 inline-block" />
                  <span className="text-rose-200">Ác tính (M)</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow shadow-emerald-500/50 inline-block" />
                  <span className="text-emerald-200">Lành tính (B)</span>
                </div>
              </div>
            )}
            {colorMode === 'cluster' && (
              <div className="flex items-center gap-2 flex-wrap max-w-xs">
                {CLUSTER_COLORS.slice(0, 5).map((col, idx) => (
                  <div key={idx} className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: col }} />
                    <span className="text-slate-300">C{idx}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                  <span className="text-slate-400">Nhiễu</span>
                </div>
              </div>
            )}
            {colorMode === 'feature' && (
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-mono text-[10px]">Thấp</span>
                <div className="w-20 h-2 rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500" />
                <span className="text-rose-400 font-mono text-[10px]">Cao</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function createTextLabelSprite(text: string, strokeColor: string = '#f43f5e'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(13, 3.25, 1);
  return sprite;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
