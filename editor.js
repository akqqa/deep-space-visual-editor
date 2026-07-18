import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

// Editor / Renderer specific code

//**************************************************//
// RENDERING IMAGES

// Helper method for calculating the sphere colors
// Visual Object colors are evaluated on a gradient [0, 64] to get RGB values. The full gradient linearly blends between keys. In the game, the keys are: 
// 0 - #FF5800 0-7
// 1 - #BBFF00 7-14
// 2 - #00CDFF 14-21
// 3 - #0084FF 21-28
// 4 - #4D00FF
// 5 - #FB39FF
// 6 - #FF0FD7
// 7 - #484848
// 8 - #636363
// 9 - #FFFFFF
// Code thanks to @elnico56 in discord!!!!
const COLORS = [
  "FF5800", "BBFF00",
  "00CDFF", "0084FF",
  "4D00FF", "FB39FF",
  "FF0FD7", "484848",
  "636363", "FFFFFF"
];

const calculateColor = (value) => {
  let n = value / 64 * (COLORS.length - 1);
  let lo = Math.floor(n);
  let hi = Math.ceil(n);
  let c = getGradientColor(COLORS[lo], COLORS[hi], n % 1)
  console.log("COLOUR " + c);
  return new THREE.Color(Number(c));
}

// Source - https://stackoverflow.com/a/27709336
// Posted by rjurado01, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-15, License - CC BY-SA 4.0
const getGradientColor = function (start_color, end_color, percent) {

  // get colors
  let start_red = parseInt(start_color.substr(0, 2), 16),
    start_green = parseInt(start_color.substr(2, 2), 16),
    start_blue = parseInt(start_color.substr(4, 2), 16);

  let end_red = parseInt(end_color.substr(0, 2), 16),
    end_green = parseInt(end_color.substr(2, 2), 16),
    end_blue = parseInt(end_color.substr(4, 2), 16);

  // calculate new color
  let diff_red = end_red - start_red;
  let diff_green = end_green - start_green;
  let diff_blue = end_blue - start_blue;

  diff_red = ((diff_red * percent) + start_red).toString(16).split('.')[0];
  diff_green = ((diff_green * percent) + start_green).toString(16).split('.')[0];
  diff_blue = ((diff_blue * percent) + start_blue).toString(16).split('.')[0];

  // ensure 2 digits by color
  if (diff_red.length == 1) diff_red = '0' + diff_red
  if (diff_green.length == 1) diff_green = '0' + diff_green
  if (diff_blue.length == 1) diff_blue = '0' + diff_blue

  console.log("red diff " + diff_red)
  console.log("blue diff " + diff_blue)
  console.log("green diff " + diff_green)

  return "0x" + diff_red + diff_green + diff_blue;
};

//***************************************************************
// VISUAL EDITOR

const initialiseEditor = () => {
  // Create the scene
  let sceneDiv = document.getElementById("view");

  if (sceneDiv.getAttribute("data-disabled") === "true") {
    return;
  }

  sceneDiv.classList.add("imageScene");

  const scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(50, sceneDiv.clientWidth /sceneDiv.clientHeight, 0.1, 2000);
  camera.position.x = -18.5;
  let renderer = new THREE.WebGLRenderer();
  renderer.logarithmicDepthBuffer = true;
  renderer.setSize(sceneDiv.clientWidth , sceneDiv.clientHeight);
  sceneDiv.appendChild(renderer.domElement);
  let composer = new EffectComposer(renderer);
  const renderPixelatedPass = new RenderPixelatedPass(4, scene, camera);
  composer.addPass(renderPixelatedPass);

  const bottomGrid = new THREE.GridHelper(30, 4, 0x13831F, 0x246E1A);
  bottomGrid.position.y = -8;
  bottomGrid.color
  const topGrid = new THREE.GridHelper(30, 4, 0x13831F, 0x246E1A);
  topGrid.position.y = 8;
  scene.add(bottomGrid);
  scene.add(topGrid);

  const controls = new OrbitControls(camera, renderer.domElement);

  function animate(time) {
    controls.update();
    composer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);

  return {
    camera,
    renderer,
    composer,
    sceneDiv,
    scene,
  };
}

const renderSpheres = (sphereData, scene) => {
    sphereData.forEach(([x, y, z, radius, color]) => {
    const sphere = new THREE.SphereGeometry(radius / 2);
    // map the color - using the key levels apples described to match the game and interpolatee between
    let c = calculateColor(color);
    // https://medium.com/@aurelienagtn/introduction-to-shaders-with-three-js-create-an-animated-sphere-d4920fbab126
    // https://learnopengl.com/code_viewer_gh.php?code=src/2.lighting/2.2.basic_lighting_specular/2.2.basic_lighting.fs
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 Normal;
        varying vec3 camDir;
        
        void main() {
          Normal = normalize(normal);

          vec3 sphereCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          camDir = normalize(cameraPosition - sphereCenter);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 Normal;  
        varying vec3 camDir;
          
        uniform vec3 lightPos; 
        uniform vec3 lightColor;
        uniform vec3 objectColor;
        
        void main()
        {
            // diffuse 
            float diffuseStrength = 0.93;
            vec3 norm = normalize(Normal);
            vec3 lightDir = camDir;
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * lightColor * diffuseStrength;

            // specular
            float specularStrength = 0.2;
            vec3 viewDir = camDir;
            vec3 reflectDir = reflect(-lightDir, norm);  
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
            vec3 specular = specularStrength * spec * lightColor;  
                
            vec3 result = ( specular + diffuse) * objectColor;
            gl_FragColor  = vec4(result, 1.0);
        } 
      `,
      uniforms: {
        lightColor: { value: new THREE.Color(0xffffff) },
        objectColor: { value: c },
      }
    });

    const mesh = new THREE.Mesh(sphere, mat);
    mesh.position.set(x, z, y); // Alien coords!
    scene.add(mesh);
  })
}

//  todo - add listener for view size update
// Add internal store of spheredata
// add import and export of that internal store
// add clicking and moving spheres
// add creating sphere
// add sidebar controls

// Ok im thinking abt spheres wrong
// Spheredata has to be an array of SphereGeometries!
// renderSpheres wont exist. it will be addSphere and removeSphere
// When importing, parse, then turn into spheres to add to the spherelist and add to the scene
// when exporting, turj spheredata into the output - this part shoudl be simple if a bit long  winded)

export {initialiseEditor, getGradientColor, calculateColor, renderSpheres};