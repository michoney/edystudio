// 靈 © 2024-01-30 by Zaron Chen is licensed under CC BY-NC-SA 3.0.
// https://creativecommons.org/licenses/by-nc-sa/3.0/
//
// Special thanks for inspiration:
//     https://gpfault.net/posts/webgl2-particles.txt.html

import { UPDATE_VERT, UPDATE_FRAG } from "./shaderSource.js"
import { RENDER_VERT, RENDER_FRAG } from "./shaderSource.js"
import Olon, { Data } from "https://cdn.jsdelivr.net/npm/olon@0.0.0/src/Olon.js"
import { random, floor, min } from "./tools.js"

const MAX_AMOUNT = 500000
const MIN_AGE = 1.01
const MAX_AGE = 2.15
const BIRTH_RATE = 0.5

const ol = Olon(1090, 690)
ol.enableCanvas2D()

let mousePos = [0, 0];
let mouseInside = true;
let spawnAtMouse = false;
let spawnFrames = 0;

let imgUrl = ["https://deckard.openprocessing.org/user454668/visual2922048/h84f63b755c76f35b95a2959a0b6d9849/ameenfahmy-JuesIryw53E-unsplash-2.jpg",
			  "https://deckard.openprocessing.org/user454668/visual2922048/h84f63b755c76f35b95a2959a0b6d9849/quino-al-BlMj6RYy3c0-unsplash.jpg",
			  "https://deckard.openprocessing.org/user454668/visual2922048/h84f63b755c76f35b95a2959a0b6d9849/luca-7m-Zigjxc8E-unsplash.jpg",
			 "https://deckard.openprocessing.org/user454668/visual2922048/h84f63b755c76f35b95a2959a0b6d9849/john-wiesenfeld-Ug6z9PCwr58-unsplash.jpg",
			 ""]
let urlIdx = 3;

window.addEventListener('mousemove', (e) => {
    if (ol.mouseX >= -1 && ol.mouseX <= 1 &&
        ol.mouseY >= -1 && ol.mouseY <= 1) {
        mouseInside = true;
        mousePos[0] = ol.mouseX * 0.75;
        mousePos[1] = ol.mouseY * 0.75;
    } else {
        mouseInside = false;
    }
});

window.addEventListener('click', () => {
    mouseInside = true;
    spawnAtMouse = true;
    spawnFrames = 24;
});

ol.blend({
    sfactor: ol.SRC_ALPHA,
    dfactor: ol.ONE_MINUS_SRC_ALPHA,
})
ol.enableBlend();

(async function init() {
    const url = imgUrl[urlIdx];
	const img = await loadImageAsync(url);
    const imageTex = ol.texture2D({
        data: img,
        width: img.width,
        height: img.height,
        iformat: ol.RGBA8,
        minFilter: ol.LINEAR,
        magFilter: ol.LINEAR,
        wrap: ol.CLAMP,
        flipY: true
    });

    const TFV = ["vPosition", "vAge", "vLife", "vVel", "vForce", "vType", "vColor"];
    const updateProgram = ol.createProgram(UPDATE_VERT, UPDATE_FRAG, TFV);
    const renderProgram = ol.createProgram(RENDER_VERT, RENDER_FRAG);

    const aPosition = { name: "aPosition", unit: "f32", size: 2 };
    const aAge      = { name: "aAge",      unit: "f32", size: 1 };
    const aLife     = { name: "aLife",     unit: "f32", size: 1 };
    const aVel      = { name: "aVel",      unit: "f32", size: 2 };
    const aForce    = { name: "aForce",    unit: "f32", size: 2 };
    const aType     = { name: "aType",     unit: "f32", size: 1 };
    const aColor    = { name: "aColor",    unit: "f32", size: 3 };
    const attributes = [aPosition, aAge, aLife, aVel, aForce, aType, aColor];

    const particleData = [];
    for (let i = 0; i < MAX_AMOUNT; i++) {
        const life = random(MIN_AGE, MAX_AGE);
        particleData.push(0, 0);           // aPosition
        particleData.push(life + 1);       // aAge
        particleData.push(life);           // aLife
        particleData.push(0, 0);           // aVel
        particleData.push(0, 0);           // aForce
        particleData.push(0);              // aType
        particleData.push(0, 0, 0);        // aColor
    }
    const initData = Data(particleData);

    const buffer0 = ol.createBuffer(initData, ol.STREAM_DRAW);
    const buffer1 = ol.createBuffer(initData, ol.STREAM_DRAW);

    const vao0 = ol.createVAO(updateProgram, { buffer: buffer0, stride: 4 * 12, attributes });
    const vao1 = ol.createVAO(updateProgram, { buffer: buffer1, stride: 4 * 12, attributes });

    const buffers = [buffer0, buffer1];
    const vaos = [vao0, vao1];
    let [read, write] = [0, 1];
    let [lastTime, bornAmount] = [0, 0];

    ol.uniform("uRandom", [random() * 1024, random() * 1024]);

    ol.render(() => {
        const time = ol.frame / 60;
        const timeDelta = time - lastTime;
        lastTime = time;

        const nextAmount = floor(bornAmount + BIRTH_RATE * 1000);
        bornAmount = min(MAX_AMOUNT, nextAmount);

        ol.clearColor(0, 0, 0, 0.25);
        ol.clearDepth();

        if (spawnFrames > 0) {
            spawnFrames--;
            if (spawnFrames === 0) spawnAtMouse = false;
        }

        ol.use({ program: updateProgram }).run(() => {
            ol.transformFeedback(vaos[read], buffers[write], ol.POINTS, () => {
                ol.uniform("uImage", imageTex);
                ol.uniform("uTimeDelta", timeDelta);
                ol.uniform("uTime", time);
                ol.uniform('uSpawnAtMouse', spawnAtMouse);
                ol.uniform('uMouse', mouseInside ? mousePos : [0, 0]);
                ol.uniform('uMouseActive', mouseInside ? 1.0 : 0.0);
                ol.points(0, bornAmount);
            });
        });

        ol.use({ program: renderProgram, VAO: vaos[write] }).run(() => ol.points(0, bornAmount));

        [read, write] = [write, read];
    });
})();

function loadImageAsync(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
        img.src = url;
    });
}
