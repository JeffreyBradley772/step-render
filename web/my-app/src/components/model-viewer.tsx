'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ModelViewerProps {
  uuid: string;
  onMetadataLoad?: (metadata: any) => void;
}

export function ModelViewer({ uuid, onMetadataLoad }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
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

    // Load GLB model
    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);

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
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [uuid, onMetadataLoad]);

  return (
    <div className="relative w-full min-h-[500px] h-[500px]">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />
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
