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

// --- Fond encre animé (simple bruit) ---
function drawInkBackground(time){
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    for(let i=0; i<data.length; i+=4){
        let x = (i/4) % canvas.width;
        let y = Math.floor(i/4 / canvas.width);
        let n = Math.sin((x+y+time)/50) * 25 + 30; // bruit simple
        data[i] = 0;
        data[i+1] = 0;
        data[i+2] = 20 + n; // bleu sombre
        data[i+3] = 200; // opacité
    }
    ctx.putImageData(imageData, 0, 0);
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
