import { $ } from "./query.js";
import { scene, sphereData, setSphereData, currentSphere, setCurrentSphere, transformControls, overlayScene, outlinesEnabled, outlinePass } from "./state.js";
import { calculateColor, toThree } from "./editor.js";
import { setLocalStorageSphereData, setSignalCounter } from "./persistence.js";
import { addToHistory } from "./history.js";

import * as THREE from 'three';

export const createSphere = (x, y, z, radius, color, scene) => {
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
    const p = (toThree(x,y,z))
    mesh.position.set(p.x, p.y, p.z); // Alien coords!
    scene.add(mesh);

    return mesh;
}

// Helper methods to add and remove a given sphere, handled the spheredata and selection logic
export const addSphere = (x,z,y,diameter,color, select, saveHistory=true) => {
    if(saveHistory) {
      addToHistory();
    }
    const sphereMesh = createSphere(x, z, y, diameter, color, scene);
    sphereData.push({mesh: sphereMesh, color: color});
    if (select) {
      deselectSphere();
      selectSphere(sphereMesh);
    }
    setLocalStorageSphereData();
    // UPDATE SIGNAL COUNT only if history is also saved (aka not bulk to reduce lag)
    if (saveHistory) {
      setSignalCounter();
    }

    // Return the mesh
    return sphereMesh;
}

export const removeSphere = (sphereMesh, saveHistory=true) => {
  if(saveHistory) {
    addToHistory();
  }
  let index = undefined;
  if (currentSphere == sphereMesh) {
    // Select previous sphere if deleting current!
    index = sphereData.findIndex(x => x.mesh == currentSphere);
    deselectSphere();
  }
  scene.remove(sphereMesh);
  sphereMesh.geometry.dispose();
  sphereMesh.material.dispose();
  setSphereData(sphereData.filter(item => item.mesh !== sphereMesh));
  setLocalStorageSphereData();

  // Select the previous sphere if deleted a selected sphere
  if (index !== undefined) {
    console.log(index);
    if (index == 0) {
      if (sphereData.length != 0) {
        selectSphere(sphereData[sphereData.length-1].mesh,);
      }
    } else {
      // Even though spheredata was filtered, we can access this fine as the index before hasnt been effected
      selectSphere(sphereData[index-1].mesh);
    }
  }

  // UPDATE SIGNAL COUNT only if history is also saved (aka not bulk to reduce lag)
  if (saveHistory) {
    setSignalCounter();
  }
}

// Add logic for enabling the parameters here
export const selectSphere = (sphere) => {
    setCurrentSphere(sphere);
    transformControls.attach(currentSphere);
    overlayScene.add(transformControls.getHelper());
    $("#sphere-parameters").setAttribute("data-disabled", "false");
    // Set volume and color parameters to the correct values! (xyz are handled already but i cant remember where?? lol oh well)
    sphere.geometry.computeBoundingSphere();
    const geometryDiameter = sphere.geometry.boundingSphere.radius * 2;
    $("#volumeAmount").value = Number(geometryDiameter.toFixed(1));
    $("#volumeSlider").value = Number(geometryDiameter.toFixed(1));
    $("#colorAmount").value = sphereData.find(x => x.mesh == currentSphere).color;
    $("#colorSlider").value = sphereData.find(x => x.mesh == currentSphere).color;
    // Update the number of the sphere!
    let index = sphereData.findIndex(x => x.mesh == currentSphere);
    $("#sphereNumber").value = index;
    //  Add to outline pass
    if (outlinesEnabled) {
      outlinePass.selectedObjects = [sphere];
    }

}

export const deselectSphere = () => {
  transformControls.detach();
  overlayScene.remove(transformControls.getHelper());
  setCurrentSphere(null);
  $("#sphere-parameters").setAttribute("data-disabled", "true");
  $("#sphereNumber").value = null;
  // Remove from outline pass
  if (outlinesEnabled) {
    outlinePass.selectedObjects = [];
  }
}