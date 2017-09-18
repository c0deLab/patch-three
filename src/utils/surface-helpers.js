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

const axisLength = 0.2;

const axisGeoX = new THREE.Geometry();
const axisGeoY = new THREE.Geometry();
const axisGeoZ = new THREE.Geometry();

axisGeoX.vertices.push(
	new THREE.Vector3(-axisLength, 0, 0),
	new THREE.Vector3( axisLength, 0, 0)
);
axisGeoY.vertices.push(
	new THREE.Vector3(0, -axisLength, 0),
	new THREE.Vector3(0,  axisLength, 0)
);
axisGeoZ.vertices.push(
	new THREE.Vector3(0, 0, -axisLength),
	new THREE.Vector3(0, 0,  axisLength)
);

const axisMaterial = new THREE.LineDashedMaterial({
	color: 0xffffff,
	linewidth: 1,
	dashSize: 0.005,
	gapSize: 0.005,
	opacity: 1,
	transparent: true
});

axisGeoX.computeLineDistances();
axisGeoY.computeLineDistances();
axisGeoZ.computeLineDistances();

const axisX = new THREE.Group();
axisX.visible = false;
const axisY = new THREE.Group();
axisY.visible = false;
const axisZ = new THREE.Group();
axisZ.visible = false;

const arrow = new THREE.Mesh(
	new THREE.ConeGeometry(0.01, 0.05, 8),
	new THREE.MeshBasicMaterial({ color: 0xffffff })
);

const arrowOneX = arrow.clone();
arrowOneX.rotation.z -= Math.PI / 2;
arrowOneX.position.set(axisLength, 0, 0);

const arrowTwoX = arrow.clone();
arrowTwoX.rotation.z += Math.PI / 2;
arrowTwoX.position.set(-axisLength, 0, 0);

const arrowOneY = arrow.clone();
arrowOneY.position.set(0, axisLength, 0);

const arrowTwoY = arrow.clone();
arrowTwoY.rotation.z += Math.PI;
arrowTwoY.position.set(0, -axisLength, 0);

const arrowOneZ = arrow.clone();
arrowOneZ.rotation.x += Math.PI / 2;
arrowOneZ.position.set(0, 0, axisLength);

const arrowTwoZ = arrow.clone();
arrowTwoZ.rotation.x -= Math.PI / 2;
arrowTwoZ.position.set(0, 0, -axisLength);

axisX.add(new THREE.Line(axisGeoX, axisMaterial.clone()));
axisX.add(arrowOneX);
axisX.add(arrowTwoX);

axisY.add(new THREE.Line(axisGeoY, axisMaterial.clone()));
axisY.add(arrowOneY);
axisY.add(arrowTwoY);

axisZ.add(new THREE.Line(axisGeoZ, axisMaterial.clone()));
axisZ.add(arrowOneZ);
axisZ.add(arrowTwoZ);

export { 
	p,
	boundaryMaterial,
	interiorMaterial,
	controlMaterial,
	controlPtMaterial,
	activeControlPointMaterial,
	axisX,
	axisY,
	axisZ
};