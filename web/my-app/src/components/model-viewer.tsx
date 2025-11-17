'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GltfNodeMetadata, GltfMetadata, ComponentHoverInfo } from '@/app/lib/schemas/step';

interface ModelViewerProps {
  uuid: string;
  metadata?: GltfMetadata | null;
  onMetadataLoad?: (metadata: any) => void;
}

export function ModelViewer({ uuid, metadata, onMetadataLoad }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<ComponentHoverInfo | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const highlightedMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setHoveredComponent(null);
    highlightedMeshRef.current = null;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Clear any existing canvases before appending new one
    // Here, this was causing overlapping canvases to render in strict mode
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    const highlightMaterialTemplate = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffb347'),
      emissive: new THREE.Color('#ff9800'),
      metalness: 0.1,
      roughness: 0.4,
    });

    const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose());
      } else {
        material.dispose();
      }
    };

    const revertHighlight = (mesh: THREE.Mesh) => {
      if (!mesh.userData.originalMaterial) return;
      disposeMaterial(mesh.material);
      mesh.material = mesh.userData.originalMaterial;
      delete mesh.userData.originalMaterial;
    };

    const defaultComponentInfo = (mesh: THREE.Mesh): ComponentHoverInfo => ({
      uuid: mesh.uuid,
      name: mesh.name || 'Unnamed component',
      nodeId: null,
      meshIndex: null,
      childCount: mesh.children.length,
    });

    const applyHighlight = (mesh: THREE.Mesh) => {
      if (highlightedMeshRef.current === mesh) {
        const metadataPayload: ComponentHoverInfo = mesh.userData.metadata || defaultComponentInfo(mesh);
        setHoveredComponent(metadataPayload);
        return;
      }

      if (highlightedMeshRef.current) {
        revertHighlight(highlightedMeshRef.current);
      }

      mesh.userData.originalMaterial = mesh.material;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(() => highlightMaterialTemplate.clone());
      } else {
        mesh.material = highlightMaterialTemplate.clone();
      }

      highlightedMeshRef.current = mesh;

      const metadataPayload: ComponentHoverInfo = mesh.userData.metadata || defaultComponentInfo(mesh);
      setHoveredComponent(metadataPayload);
    };

    const clearHighlight = () => {
      if (!highlightedMeshRef.current) {
        setHoveredComponent(null);
        return;
      }
      revertHighlight(highlightedMeshRef.current);
      highlightedMeshRef.current = null;
      setHoveredComponent(null);
    };

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const handlePointerMove = (event: PointerEvent) => {
      console.log('Pointer move', event);
      if (!cameraRef.current || !sceneRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
      const meshIntersection = intersects.find((intersection) => intersection.object instanceof THREE.Mesh);

      if (meshIntersection) {
        applyHighlight(meshIntersection.object as THREE.Mesh);
      } else {
        clearHighlight();
      }
    };

    const handlePointerLeave = () => {
      clearHighlight();
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    // Load GLB model
    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);
        setHoveredComponent(null);
        highlightedMeshRef.current = null;

        console.log('Fetching download URL for UUID:', uuid);

        // Fetch download URL from API
        const response = await fetch(`http://localhost:8000/api/v1/files/${uuid}/render-download-url`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch download URL:', response.status, errorText);
          throw new Error(`Failed to fetch download URL: ${response.status}`);
        }
        const data = await response.json();
        console.log('Download URL:', data.download_url);

        // Load the GLB model
        const loader = new GLTFLoader();
        console.log('Starting GLB load from:', data.download_url);
        loader.load(
          data.download_url,
          (gltf) => {
            console.log('GLB loaded successfully!', gltf);
            
            // Remove any existing model
            const existingModel = scene.getObjectByName('model');
            if (existingModel) {
              scene.remove(existingModel);
            }

            // Add new model
            gltf.scene.name = 'model';
            scene.add(gltf.scene);

            const metadataByName = new Map<string, GltfNodeMetadata>();
            metadata?.nodes?.forEach((node) => {
              if (node.name) {
                metadataByName.set(node.name, node);
              } else if (typeof node.id === 'number') {
                metadataByName.set(`node_${node.id}`, node);
              }
            });

            // Center and scale model
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;

            console.log('Model size:', size, 'Max dimension:', maxDim, 'Scale:', scale);

            gltf.scene.scale.multiplyScalar(scale);
            gltf.scene.position.sub(center.multiplyScalar(scale));

            // Adjust camera to fit model
            camera.position.set(5, 5, 5);
            controls.target.set(0, 0, 0);
            controls.update();

            gltf.scene.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const nodeMeta = metadataByName.get(child.name || '') || null;
                const componentInfo: ComponentHoverInfo = {
                  uuid: child.uuid,
                  name: child.name || nodeMeta?.name || 'Unnamed component',
                  nodeId: nodeMeta?.id ?? null,
                  meshIndex: nodeMeta?.mesh ?? null,
                  childCount: nodeMeta?.children?.length ?? child.children.length,
                };
                child.userData.metadata = componentInfo;
              }
            });

            console.log('Model positioned, loading complete');
            setLoading(false);

            // Pass metadata to parent if callback provided
            if (onMetadataLoad) {
              const metadata = {
                nodes: [] as any[],
              };
              gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  metadata.nodes.push({
                    name: child.name || 'unnamed',
                    uuid: child.uuid,
                  });
                }
              });
              onMetadataLoad(metadata);
            }
          },
          (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
          },
          (error) => {
            console.error('Error loading GLB model:', error);
            setError('Failed to load 3D model: ' + error);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error in loadModel:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadModel();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      clearHighlight();
      highlightMaterialTemplate.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [uuid, onMetadataLoad, metadata]);

  return (
    <div className="relative w-full min-h-[500px] h-[500px]">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />
      <div className="pointer-events-none absolute top-4 right-4 w-72 rounded-lg border bg-background/90 backdrop-blur-sm shadow">
        <div className="p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Component Details</p>
          {hoveredComponent ? (
            <div className="space-y-1 text-sm">
              <p className="text-base font-semibold text-foreground">{hoveredComponent.name}</p>
              {hoveredComponent.nodeId !== null && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Node ID</span>
                  <span className="text-foreground">{hoveredComponent.nodeId}</span>
                </div>
              )}
              {hoveredComponent.meshIndex !== null && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Mesh Index</span>
                  <span className="text-foreground">{hoveredComponent.meshIndex}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Child Nodes</span>
                <span className="text-foreground">{hoveredComponent.childCount}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Hover a component to see more.</p>
          )}
        </div>
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading 3D model...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center p-6 bg-background rounded-lg shadow-lg">
            <p className="text-destructive font-medium mb-2">Error</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
