const canvas = document.getElementById('inkCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Variables animation ---
let time = 0;
const drop = {x: canvas.width/2, y: -50, radius: 20, falling: true};
let waveRadius = 0;
const waveMax = 300;

// --- Audio ---
const oceanHum = document.getElementById('oceanHum');
const chimes = document.getElementById('chimes');
document.body.addEventListener('click', () => {
    oceanHum.play();
});

// --- Ligne lumineuse ---
function drawLine(time){
    ctx.strokeStyle = 'rgba(142,243,255,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#8EF3FF';
    ctx.beginPath();
    let y = canvas.height/3 + Math.sin(time/50) * 50;
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
}

// --- BRUIT PERLIN SIMPLE POUR FOND ENCRE ---
class PerlinNoise {
    constructor(){
        this.gradients = {};
        this.memory = {};
    }
    rand_vect(){
        let theta = Math.random() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    }
    dot_prod_grid(x, y, vx, vy){
        let g_vect;
        let d_vect = {x: x - vx, y: y - vy};
        if(this.gradients[[vx,vy]]){
            g_vect = this.gradients[[vx,vy]];
        } else {
            g_vect = this.rand_vect();
            this.gradients[[vx,vy]] = g_vect;
        }
        return d_vect.x*g_vect.x + d_vect.y*g_vect.y;
    }
    smootherstep(x){ return x*x*x*(x*(x*6-15)+10); }
    interp(x, a, b){ return a + this.smootherstep(x)*(b-a); }
    get(x, y){
        if(this.memory[[x,y]] !== undefined) return this.memory[[x,y]];
        let x0 = Math.floor(x);
        let x1 = x0 + 1;
        let y0 = Math.floor(y);
        let y1 = y0 + 1;

        let sx = x - x0;
        let sy = y - y0;

        let n0 = this.dot_prod_grid(x, y, x0, y0);
        let n1 = this.dot_prod_grid(x, y, x1, y0);
        let ix0 = this.interp(sx, n0, n1);

        n0 = this.dot_prod_grid(x, y, x0, y1);
        n1 = this.dot_prod_grid(x, y, x1, y1);
        let ix1 = this.interp(sx, n0, n1);

        let value = this.interp(sy, ix0, ix1);
        this.memory[[x,y]] = value;
        return value;
    }
}

const perlin = new PerlinNoise();

// --- Dessin du fond volutes d'encre ---
function drawInkBackground(time){
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;
    let scale = 0.005; // zoom du bruit
    for(let y=0; y<canvas.height; y++){
        for(let x=0; x<canvas.width; x++){
            let value = perlin.get(x*scale + time*0.01, y*scale + time*0.01);
            let c = Math.floor((value + 1) * 50); // amplitude ajustable
            let idx = (y*canvas.width + x)*4;
            data[idx] = 0;
            data[idx+1] = 0;
            data[idx+2] = 20 + c; // bleu sombre
            data[idx+3] = 200; // opacité
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// --- Goutte et onde ---
function drawDrop(){
    if(drop.falling){
        drop.y += 4;
        ctx.fillStyle = '#69D9FF';
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, 2*Math.PI);
        ctx.fill();
        if(drop.y >= canvas.height/2){
            drop.falling = false;
            waveRadius = 0;
            chimes.play();
        }
    } else {
        // onde circulaire
        waveRadius += 4;
        ctx.strokeStyle = `rgba(142,243,255,${1-waveRadius/waveMax})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, waveRadius, 0, 2*Math.PI);
        ctx.stroke();
        if(waveRadius >= waveMax){
            document.getElementById('enterBtn').style.opacity = 1;
        }
    }
}

// --- Animation loop ---
function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawInkBackground(time);
    drawLine(time);
    drawDrop();
    time++;
    requestAnimationFrame(animate);
}

animate();

// --- Ajuster la taille du canvas ---
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
