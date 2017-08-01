const THREE = require('three');

// helper for new vec3
const p = (x, y, z = 0.5) => new THREE.Vector3(x - 0.5, y - 0.5, z - 0.5);

const boundaryMaterial = new THREE.LineBasicMaterial({ 
	color : 0xffffff,
	linewidth: 3,
	linecap: 'round'
});

const interiorMaterial = boundaryMaterial.clone();
interiorMaterial.linewidth = 1;

const controlMaterial = new THREE.LineDashedMaterial({
  color: 0xffffff,
  linewidth: 1,
  dashSize: 0.015,
  gapSize: 0.015,
});

const controlPtMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  opacity: 0.5,
  transparent: true
});

const activeControlPointMaterial = controlPtMaterial.clone();
activeControlPointMaterial.transparent = false;

export { 
	p,
	boundaryMaterial,
	interiorMaterial,
	controlMaterial,
	controlPtMaterial,
	activeControlPointMaterial
};