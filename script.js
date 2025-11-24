const canvas = document.getElementById('inkCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let time = 0;
const drop = {x: canvas.width/2, y: -50, radius: 20, falling: true};
let waveRadius = 0;
const waveMax = 300;
let waveFinished = false;

const oceanHum = document.getElementById('oceanHum');
const chimes = document.getElementById('chimes');
document.body.addEventListener('click', () => oceanHum.play());

// --- Perlin Noise ---
class PerlinNoise {
    constructor(){ this.gradients={}; this.memory={}; }
    rand_vect(){ let theta=Math.random()*2*Math.PI; return {x:Math.cos(theta),y:Math.sin(theta)}; }
    dot_prod_grid(x,y,vx,vy){ 
        let g_vect=this.gradients[[vx,vy]]||this.rand_vect();
        this.gradients[[vx,vy]]=g_vect;
        let d_vect={x:x-vx,y:y-vy}; 
        return d_vect.x*g_vect.x + d_vect.y*g_vect.y; 
    }
    smootherstep(x){ return x*x*x*(x*(x*6-15)+10); }
    interp(x,a,b){ return a+this.smootherstep(x)*(b-a); }
    get(x,y){
        if(this.memory[[x,y]]!==undefined) return this.memory[[x,y]];
        let x0=Math.floor(x), x1=x0+1, y0=Math.floor(y), y1=y0+1;
        let sx=x-x0, sy=y-y0;
        let n0=this.dot_prod_grid(x,y,x0,y0);
        let n1=this.dot_prod_grid(x,y,x1,y0);
        let ix0=this.interp(sx,n0,n1);
        n0=this.dot_prod_grid(x,y,x0,y1);
        n1=this.dot_prod_grid(x,y,x1,y1);
        let ix1=this.interp(sx,n0,n1);
        let value=this.interp(sy,ix0,ix1);
        this.memory[[x,y]]=value;
        return value;
    }
}

const perlin = new PerlinNoise();

// --- Fond animé : volutes qui respirent ---
function drawInkBackground(time){
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;
    let scale = 0.004;

    for(let y=0; y<canvas.height; y++){
        for(let x=0; x<canvas.width; x++){
            let nx = x*scale + time*0.02;
            let ny = y*scale + time*0.02;

            // turbulence autour de la goutte même avant impact
            let dx = x-drop.x, dy = y-drop.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < waveRadius + 100){ // zone d'influence pendant la chute
                let effect = Math.sin((waveRadius + 100 - dist)/12)*3;
                nx += dx*0.001*effect;
                ny += dy*0.001*effect;
            }

            // plusieurs volutes + mouvement aléatoire
            let noise1 = perlin.get(nx, ny);
            let noise2 = perlin.get(nx*1.5, ny*1.5);
            let randomShift = Math.sin(time*0.01 + x*0.02 + y*0.02)*0.5;
            let value = noise1 + 0.5*noise2 + randomShift;

            let c = Math.floor((value+1)*50);
            let idx = (y*canvas.width + x)*4;
            data[idx] = 0;
            data[idx+1] = 0;
            data[idx+2] = 20 + c;
            data[idx+3] = 200;
        }
    }
    ctx.putImageData(imgData,0,0);
}

                 
// --- Goutte réaliste (teardrop) ---
function drawDrop(){
    const speed = 8;
    if(drop.falling){
        drop.y += speed;
        let grd = ctx.createRadialGradient(drop.x, drop.y, 2, drop.x, drop.y, drop.radius);
        grd.addColorStop(0,'#A0F0FF');
        grd.addColorStop(0.5,'#69D9FF');
        grd.addColorStop(1,'rgba(105,217,255,0.3)');
        ctx.fillStyle = grd;

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y - drop.radius);
        ctx.bezierCurveTo(drop.x + drop.radius*0.6, drop.y - drop.radius*0.3, drop.x + drop.radius*0.3, drop.y + drop.radius, drop.x, drop.y + drop.radius);
        ctx.bezierCurveTo(drop.x - drop.radius*0.3, drop.y + drop.radius, drop.x - drop.radius*0.6, drop.y - drop.radius*0.3, drop.x, drop.y - drop.radius);
        ctx.fill();

        if(drop.y >= canvas.height/2){
            drop.falling = false;
            waveRadius = 0;
            chimes.play();
        }
    } else if(!waveFinished){
        waveRadius += 10;
        ctx.strokeStyle = `rgba(142,243,255,${1-waveRadius/waveMax})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, waveRadius, 0, 2*Math.PI);
        ctx.stroke();
        if(waveRadius >= waveMax){
            document.getElementById('enterBtn').style.opacity = 1;
            waveFinished = true;
        }
    }
}

// --- Animation loop ---
function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawInkBackground(time);
    drawDrop();
    time++;
    requestAnimationFrame(animate);
}

// --- Start ---
animate();
window.addEventListener('resize',()=>{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
