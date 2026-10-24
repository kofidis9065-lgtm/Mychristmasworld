import * as THREE from 'three';

export function createSnowTerrain(): THREE.Group {
  const terrainGroup = new THREE.Group();
  terrainGroup.name = 'SnowTerrain';

  // Main circular/beveled buildable snowy ground
  const radius = 22;
  const segments = 48;
  const terrainGeo = new THREE.CylinderGeometry(radius, radius + 1.5, 1.2, segments);
  
  // Snow Material with subtle roughness
  const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    roughness: 0.94,
    metalness: 0.02,
  });

  const groundMesh = new THREE.Mesh(terrainGeo, snowMaterial);
  groundMesh.position.y = -0.6;
  groundMesh.receiveShadow = true;
  groundMesh.name = 'GroundMesh';
  terrainGroup.add(groundMesh);

  // Soft contact ground shadow plane directly below
  const shadowPlaneGeo = new THREE.CircleGeometry(radius + 4, 32);
  shadowPlaneGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x050a12,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowPlaneGeo, shadowMat);
  shadowMesh.position.y = -1.22;
  terrainGroup.add(shadowMesh);

  return terrainGroup;
}
