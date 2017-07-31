import easing from './utils/easing';

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

/*
 *	Returns a curve object to be added to a scene.
 */
const Curve = (v0, v1, v2, v3) => {

	const bez = new THREE.CubicBezierCurve3(v0, v1, v2, v3);
	
	const geo = new THREE.Geometry();
	geo.vertices = bez.getPoints(50);
	
	let crv = new THREE.Line(geo, boundaryMaterial);
	crv.__bez = bez;

	return crv;
};

/*
 * A patched surface from four boundary Bezier curves.
 */
class Surface {

  constructor() {

    /*
     * Default Surface: square from 0-1, control points evenly spaced
     */

    const u0 = Curve(p(0, 0), p(0.333, 0), p(0.667, 0), p(1, 0));
    const u1 = Curve(p(0, 1), p(0.333, 1), p(0.667, 1), p(1, 1));
    const v0 = Curve(p(0, 0), p(0, 0.333), p(0, 0.667), p(0, 1));
    const v1 = Curve(p(1, 0), p(1, 0.333), p(1, 0.667), p(1, 1));

    this.u0 = u0;
    this.u1 = u1;
    this.v0 = v0;
    this.v1 = v1;

    this.controls = false;

  }

  toggleControls() {
    this.controls = !this.controls;
    this.update();
  }

  addControl(v, size) {
    const d = 0.006 * size;
    const controlPtGeo = new THREE.SphereGeometry(d, 8, 8); // BoxGeometry(d, d, d);
    const controlPt = new THREE.Mesh(controlPtGeo, controlPtMaterial);
    controlPt.position.set(v.x, v.y, v.z);
    this.scene.add(controlPt);
  }

  addControlLine(v1, v2) {
    const lineGeo = new THREE.Geometry();
    lineGeo.vertices.push(v1, v2);
    lineGeo.computeLineDistances();
    this.scene.add(new THREE.Line(lineGeo, controlMaterial));
  }

  setScene(scene) { this.scene = scene; }
  
  update() {

  	// tear down all existing scene objects
    const children = this.scene.children;
    // clean up
    while (children.length > 0) {
      const child = children.pop();
      this.scene.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }

  	// add interior curves
  	const step = 0.04;

  	for (let u = 0; u < 1 + step; u += step) {

      if (u > 1) u = 1;

  		let u_crv = new THREE.Geometry();
      let v_crv = new THREE.Geometry();
  		
  		for (let v = 0; v < 1 + step; v += step) {

        if (v > 1) v = 1;

	  		let u_pt = this.patch(u, v);
        let v_pt = this.patch(v, u);

	  		u_crv.vertices.push(u_pt);
        v_crv.vertices.push(v_pt);
	  	}

      let material = (u === 0 || u === 1) ? boundaryMaterial : interiorMaterial;

  		this.scene.add(new THREE.Line(u_crv, material));
      this.scene.add(new THREE.Line(v_crv, material));
  	}

    if (this.controls) {

      this.addControl(this.v0.__bez.v0, 3);
      this.addControl(this.v0.__bez.v1, 2);
      this.addControl(this.v0.__bez.v2, 2);
      this.addControl(this.v0.__bez.v3, 3);

      this.addControl(this.v1.__bez.v0, 3);
      this.addControl(this.v1.__bez.v1, 2);
      this.addControl(this.v1.__bez.v2, 2);
      this.addControl(this.v1.__bez.v3, 3);

      this.addControl(this.u0.__bez.v1, 2);
      this.addControl(this.u0.__bez.v2, 2);
      this.addControl(this.u1.__bez.v1, 2);
      this.addControl(this.u1.__bez.v2, 2);

      this.addControlLine(this.v0.__bez.v0, this.v0.__bez.v1);
      this.addControlLine(this.v0.__bez.v0, this.u0.__bez.v1);

      this.addControlLine(this.v0.__bez.v3, this.v0.__bez.v2);
      this.addControlLine(this.v0.__bez.v3, this.u1.__bez.v1);

      this.addControlLine(this.v1.__bez.v0, this.v1.__bez.v1);
      this.addControlLine(this.v1.__bez.v0, this.u0.__bez.v2);

      this.addControlLine(this.v1.__bez.v3, this.v1.__bez.v2);
      this.addControlLine(this.v1.__bez.v3, this.u1.__bez.v2);
    }
  }

  /**
   * Evaluate a pair of u/v coordinates on the surface, returning
   * a `Point` in world space.
   * @param {Number} u The u parameter, between 0 and 1 (inclusive).
   * @param {Number} v The v parameter, between 0 and 1 (inclusive).
   * @returns {Point} The `Point` on the surface (in world space).
   */
  patch(u: number, v: number): Point {

  	// reference bezier curves, not curve objects
    const u0 = this.u0.__bez;
    const u1 = this.u1.__bez;
    const v0 = this.v0.__bez;
    const v1 = this.v1.__bez;

    const Lu = u0.getPoint(u).multiplyScalar(1 - v).add(u1.getPoint(u).multiplyScalar(v));
    const Lv = v0.getPoint(v).multiplyScalar(1 - u).add(v1.getPoint(v).multiplyScalar(u));
    const B = u0.getPoint(0).multiplyScalar((1 - u) * (1 - v))
            .add(u0.getPoint(1).multiplyScalar(u * (1 - v)))
            .add(u1.getPoint(0).multiplyScalar((1 - u) * v))
            .add(u1.getPoint(1).multiplyScalar(u * v));

    const C = Lu.add(Lv).add(B.multiplyScalar(-1));
    return C;
  }

  step(t, duration, cb) {
    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this[k].__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {

        let srfPt = b[pt];

        srfPt.x += easing.dEase(t / duration) * srfPt.__dx / duration;
        srfPt.y += easing.dEase(t / duration) * srfPt.__dy / duration;
        srfPt.z += easing.dEase(t / duration) * srfPt.__dz / duration;
      });
    });

    this.update(); // update interior curves

    if (t < duration && cb) {
      window.requestAnimationFrame(() => {
        cb();
        this.step(t + 1, duration, cb);
      });
    }
  }

  morph(duration, cb) {

    let r = () => Math.random();
    let rp = () => p(r(), r(), r());

    // target surface to morph toward
    let s = new Surface();

    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this[k].__bez; // boundary curve
      
      s[k] = this[k].clone(); // boundary curve object of new surface = same as this
      s[k].__bez = b;

      ["v0", "v1", "v2", "v3"].forEach((pt) => {

        // for legibility, this is the point on the target surface
        // corresponding to the current boundary curve's control point
        let srfPt = b[pt];
        let targetPt = s[k].__bez[pt];

        // add a random value to it
        targetPt = b[pt].clone().add(rp());

        // resolve corner cases
        if (k === "v0" && pt === "v0") targetPt = this.u0.__bez.v0;
        if (k === "v0" && pt === "v3") targetPt = this.u1.__bez.v0;
        if (k === "v1" && pt === "v0") targetPt = this.u0.__bez.v3;
        if (k === "v1" && pt === "v3") targetPt = this.u1.__bez.v3;

        srfPt.__dx = targetPt.x - srfPt.x;
        srfPt.__dy = targetPt.y - srfPt.y;
        srfPt.__dz = targetPt.z - srfPt.z;
      });
    });

    // now that we have the target surface, step toward it
    this.step(0, duration, cb);
  }

  restore(duration, cb) {

    let s = new Surface();

    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this[k].__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {

        // for legibility, this is the point on the target surface
        // corresponding to the current boundary curve's control point
        let srfPt = b[pt];
        let targetPt = s[k].__bez[pt];

        srfPt.__dx = targetPt.x - srfPt.x;
        srfPt.__dy = targetPt.y - srfPt.y;
        srfPt.__dz = targetPt.z - srfPt.z;
      });
    });

    // now that we have the target surface, step toward it
    this.step(0, duration, cb);
  }

  rotate(axis, angle) {
    ["u0", "v0", "u1", "v1"].forEach((b) => {
      
      let crv = this[b].__bez;
      
      ["v0", "v1", "v2", "v3"].forEach((k) => {
        let pt = crv[k];
        pt.applyAxisAngle(axis, angle);
      });
    });

    this.update();
  }
}

export default Surface;
