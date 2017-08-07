const THREE = require('three');

const axisGeoX = new THREE.Geometry();
const axisGeoY = new THREE.Geometry();
const axisGeoZ = new THREE.Geometry();

axisGeoX.vertices.push(
	new THREE.Vector3(-10000, 0, 0),
	new THREE.Vector3( 10000, 0, 0)
);
axisGeoY.vertices.push(
	new THREE.Vector3(0, -10000, 0),
	new THREE.Vector3(0,  10000, 0)
);
axisGeoZ.vertices.push(
	new THREE.Vector3(0, 0, -10000),
	new THREE.Vector3(0, 0,  10000)
);

const axisMaterial = new THREE.LineDashedMaterial({
	color: 0xffffff,
	linewidth: 1,
	dashSize: 0.06,
	gapSize: 0.06,
	opacity: 0.5,
	transparent: true
});

axisGeoX.computeLineDistances();
axisGeoY.computeLineDistances();
axisGeoZ.computeLineDistances();

const axisX = new THREE.Line(axisGeoX, axisMaterial);
const axisY = new THREE.Line(axisGeoY, axisMaterial);
const axisZ = new THREE.Line(axisGeoZ, axisMaterial);

export {
	axisX,
	axisY,
	axisZ
};