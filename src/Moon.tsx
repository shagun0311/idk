
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function Moon() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    camera.position.set(0, 0, 3.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;

    // Generate a procedural lunar surface texture.
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;

    const context = canvas.getContext('2d')!;
    const image = context.createImageData(1024, 512);

    for (let i = 0; i < image.data.length; i += 4) {
      const shade = 105 + Math.random() * 65;
      image.data[i] = shade;
      image.data[i + 1] = shade;
      image.data[i + 2] = shade + 3;
      image.data[i + 3] = 255;
    }

    context.putImageData(image, 0, 0);

    for (let i = 0; i < 750; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const radius = 2 + Math.random() * 13;

      const gradient = context.createRadialGradient(
        x - radius * 0.25,
        y - radius * 0.25,
        radius * 0.1,
        x,
        y,
        radius
      );

      gradient.addColorStop(0, 'rgba(35, 40, 46, 0.35)');
      gradient.addColorStop(0.65, 'rgba(55, 60, 65, 0.2)');
      gradient.addColorStop(1, 'rgba(210, 215, 220, 0.18)');

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 1,
      })
    );

    scene.add(moon);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const sunlight = new THREE.DirectionalLight(0xffffff, 3);
    sunlight.position.set(-3, 2, 4);
    scene.add(sunlight);

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });

    resizeObserver.observe(container);

    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      controls.dispose();
      moon.geometry.dispose();
      moon.material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="moon3d-container" ref={containerRef} />;
}
