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

const axisGeoX = new THREE.Geometry();
const axisGeoY = new THREE.Geometry();
const axisGeoZ = new THREE.Geometry();

axisGeoX.vertices.push(
	new THREE.Vector3(-0.25, 0, 0),
	new THREE.Vector3( 0.25, 0, 0)
);
axisGeoY.vertices.push(
	new THREE.Vector3(0, -0.25, 0),
	new THREE.Vector3(0,  0.25, 0)
);
axisGeoZ.vertices.push(
	new THREE.Vector3(0, 0, -0.25),
	new THREE.Vector3(0, 0,  0.25)
);

const axisMaterial = new THREE.LineDashedMaterial({
	color: 0xffffff,
	linewidth: 1,
	dashSize: 0.01,
	gapSize: 0.01,
	opacity: 0,
	transparent: true
});

axisGeoX.computeLineDistances();
axisGeoY.computeLineDistances();
axisGeoZ.computeLineDistances();

const axisX = new THREE.Line(axisGeoX, axisMaterial);
const axisY = new THREE.Line(axisGeoY, axisMaterial);
const axisZ = new THREE.Line(axisGeoZ, axisMaterial);

export { 
	p,
	boundaryMaterial,
	interiorMaterial,
	controlMaterial,
	controlPtMaterial,
	activeControlPointMaterial,
	axisMaterial,
	axisX,
	axisY,
	axisZ
};