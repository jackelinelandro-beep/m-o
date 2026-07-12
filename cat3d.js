(() => {
  "use strict";
  const canvas = document.getElementById("cat-canvas");
  const stage = canvas?.closest(".cat-stage");
  if (!canvas || !stage || !window.THREE) return;

  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    camera.position.set(0, .65, 5.4);
    camera.lookAt(0, .45, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.HemisphereLight(0xffe4c2, 0x181020, .62));
    const key = new THREE.SpotLight(0xffc66b, 1.05, 14, Math.PI / 5, .55, 1.2);
    key.position.set(3.5, 6, 4); key.castShadow = true; scene.add(key);
    const rim = new THREE.PointLight(0xd34c3f, .85, 10); rim.position.set(-3, 2.5, 1.5); scene.add(rim);
    const blue = new THREE.PointLight(0x4b91b0, .55, 9); blue.position.set(3, 1, -2); scene.add(blue);

    const gray = new THREE.MeshStandardMaterial({ color: 0x3e4248, roughness: .76, metalness: .02 });
    const lightGray = new THREE.MeshStandardMaterial({ color: 0x666b72, roughness: .7 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xb84f70, roughness: .52, metalness: .06 });
    const black = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: .25, metalness: .65 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe6aa37, roughness: .25, metalness: .72 });
    const eyeGreen = new THREE.MeshStandardMaterial({ color: 0xb9dc58, emissive: 0x5d7c18, emissiveIntensity: .7, roughness: .2 });
    const lens = new THREE.MeshPhysicalMaterial({ color: 0x171014, transparent: true, opacity: .68, roughness: .05, metalness: .2, transmission: .12 });
    const pearl = new THREE.MeshPhysicalMaterial({ color: 0xfff6e6, roughness: .1, metalness: .05, clearcoat: 1 });

    const cat = new THREE.Group();
    cat.position.y = -.55;
    scene.add(cat);

    function mesh(geometry, material, position, scale = [1,1,1]) {
      const object = new THREE.Mesh(geometry, material);
      object.position.set(...position); object.scale.set(...scale);
      object.castShadow = true; object.receiveShadow = true; cat.add(object); return object;
    }

    mesh(new THREE.SphereGeometry(.88, 40, 32), gray, [0, .15, 0], [.88, 1.18, .76]);
    mesh(new THREE.SphereGeometry(.83, 40, 32), pink, [0, .1, .03], [.9, 1.02, .79]);
    mesh(new THREE.SphereGeometry(.72, 44, 36), lightGray, [0, 1.32, .04], [1, .92, .92]);
    mesh(new THREE.SphereGeometry(.28, 24, 18), lightGray, [-.27, 1.08, .56], [1.12,.72,.7]);
    mesh(new THREE.SphereGeometry(.28, 24, 18), lightGray, [.27, 1.08, .56], [1.12,.72,.7]);

    [-.38,.38].forEach((x, index) => {
      const ear = mesh(new THREE.ConeGeometry(.27, .7, 4), gray, [x, 1.93, .02], [1,.98,.72]);
      ear.rotation.set(0, Math.PI / 4, index ? -.13 : .13);
      const inner = mesh(new THREE.ConeGeometry(.14, .42, 4), pink, [x, 1.96, .18], [1,.9,.55]);
      inner.rotation.set(0, Math.PI / 4, index ? -.13 : .13);
    });

    [-.25,.25].forEach(x => {
      mesh(new THREE.SphereGeometry(.115, 22, 18), eyeGreen, [x, 1.42, .64], [1,.8,.45]);
      mesh(new THREE.SphereGeometry(.045, 14, 12), black, [x, 1.42, .695], [.65,1,.35]);
      const frame = mesh(new THREE.TorusGeometry(.205, .035, 10, 36), gold, [x, 1.43, .705]);
      frame.scale.y = .82;
      const glass = mesh(new THREE.CircleGeometry(.18, 32), lens, [x, 1.43, .69]);
      glass.scale.y = .82;
    });
    const bridge = mesh(new THREE.CylinderGeometry(.025,.025,.17,12), gold, [0,1.43,.71]); bridge.rotation.z = Math.PI / 2;
    mesh(new THREE.ConeGeometry(.075,.12,3), pink, [0,1.18,.71], [1,.65,.6]).rotation.z = Math.PI;

    const whiskerMaterial = new THREE.LineBasicMaterial({ color: 0xf5ead8, transparent: true, opacity: .72 });
    [-1,1].forEach(side => {
      [-.1,0,.1].forEach(offset => {
        const points = [new THREE.Vector3(.24 * side,1.17 + offset,.66),new THREE.Vector3(1.0 * side,1.08 + offset * 1.7,.76)];
        cat.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), whiskerMaterial));
      });
    });

    for (let index = 0; index < 15; index += 1) {
      const angle = Math.PI * 2 * index / 15;
      mesh(new THREE.SphereGeometry(.065,16,12), pearl, [Math.cos(angle)*.55,.73 + Math.sin(angle)*.1,Math.sin(angle)*.42 + .03]);
    }
    mesh(new THREE.SphereGeometry(.095,18,14), gold, [0,.58,.48]);

    [-.48,.48].forEach(x => {
      mesh(new THREE.CylinderGeometry(.14,.18,.72,20), gray, [x,-.43,.13], [.9,1,.92]);
      mesh(new THREE.SphereGeometry(.22,24,18), lightGray, [x,-.83,.34], [1.08,.5,1.35]);
    });

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.6,-.45,-.3),new THREE.Vector3(1.1,-.15,-.45),
      new THREE.Vector3(1.28,.55,-.18),new THREE.Vector3(.88,1.05,.15)
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve,32,.105,12,false), gray);
    tail.castShadow = true; cat.add(tail);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.1,64), new THREE.MeshStandardMaterial({ color: 0x211710, roughness: .82, metalness: .08 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.38; floor.receiveShadow = true; scene.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5,1.58,64), new THREE.MeshBasicMaterial({ color: 0xe6aa37, transparent: true, opacity: .42, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -1.365; scene.add(ring);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(110 * 3);
    for (let index = 0; index < 110; index += 1) {
      const angle = Math.random() * Math.PI * 2, radius = 1.6 + Math.random() * 2.1;
      positions[index*3] = Math.cos(angle) * radius;
      positions[index*3+1] = Math.random() * 4 - 1.3;
      positions[index*3+2] = Math.sin(angle) * radius - .5;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions,3));
    const particles = new THREE.Points(particleGeometry,new THREE.PointsMaterial({ color: 0xe6aa37,size: .035,transparent: true,opacity: .72 }));
    scene.add(particles);

    let targetY = 0, targetX = 0, dragging = false, lastX = 0, lastY = 0, visible = true, mode = "calm", spinSpeed = .0025, hopBoost = 0, celebrationUntil = 0;
    canvas.addEventListener("pointerdown", event => { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture?.(event.pointerId); });
    canvas.addEventListener("pointermove", event => {
      if (!dragging) return;
      targetY += (event.clientX-lastX) * .011;
      targetX = Math.max(-.26,Math.min(.22,targetX + (event.clientY-lastY)*.004));
      lastX = event.clientX; lastY = event.clientY;
    });
    ["pointerup","pointercancel"].forEach(type => canvas.addEventListener(type,()=>dragging=false));
    canvas.addEventListener("wheel", event => {
      event.preventDefault(); camera.position.z = Math.max(3.8,Math.min(6.5,camera.position.z + event.deltaY*.003));
    },{passive:false});

    function resize() {
      const width = Math.max(1,stage.clientWidth), height = Math.max(1,stage.clientHeight);
      renderer.setSize(width,height,false); camera.aspect = width/height; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(stage); resize();
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; },{rootMargin:"180px"}).observe(stage);

    window.cat3d = {
      setMode(nextMode) {
        mode = nextMode;
        if (mode === "party") { rim.color.setHex(0xff2d95); blue.color.setHex(0x5e65ff); spinSpeed = .025; }
        else if (mode === "boss") { rim.color.setHex(0xe6aa37); blue.color.setHex(0x5b3100); spinSpeed = .001; targetY = 0; }
        else { rim.color.setHex(0xd34c3f); blue.color.setHex(0x4b91b0); spinSpeed = .0025; }
      },
      react() {
        hopBoost = Math.max(hopBoost, .28);
        targetY += .42 + Math.random() * .34;
        targetX = -.08 + Math.random() * .16;
      },
      celebrate() {
        mode = "party";
        rim.color.setHex(0xff2d95); blue.color.setHex(0x5e65ff);
        spinSpeed = .045;
        targetY += Math.PI * 4;
        hopBoost = .58;
        celebrationUntil = performance.now() + 5200;
      }
    };

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      const time = clock.getElapsedTime();
      if (celebrationUntil && performance.now() > celebrationUntil) {
        celebrationUntil = 0; spinSpeed = .025;
      }
      if (!dragging) targetY += spinSpeed;
      cat.rotation.y += (targetY-cat.rotation.y)*.075;
      cat.rotation.x += (targetX-cat.rotation.x)*.07;
      hopBoost *= .91;
      cat.position.y = -.55 + Math.sin(time*(mode === "party" ? 5.5 : 1.6))*(mode === "party" ? .095 : .025) + Math.abs(Math.sin(time * 10)) * hopBoost;
      tail.rotation.z = Math.sin(time*1.4)*.09;
      ring.rotation.z += mode === "party" ? .028 : .006;
      particles.rotation.y += mode === "party" ? .012 : .0025;
      key.intensity = mode === "party" ? 1.15 + Math.sin(time*8)*.35 : 1.05;
      renderer.render(scene,camera);
    }
    animate();
    stage.classList.add("webgl-ready");
    document.getElementById("cat-progress")?.classList.add("done");
  } catch (error) {
    console.warn("WebGL fallback active", error);
    document.getElementById("cat-progress")?.classList.add("done");
  }
})();
