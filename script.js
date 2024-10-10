let directionX = 1;
let directionY = 1;

let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;

let message = document.getElementById("tempMsg");

function edgeDetector(){
    let rect = message.getBoundingClientRect();
    if (rect.left <= 0 || rect.right >= windowWidth){
        directionX *= -1;
    }
    if (rect.top <= 0 || rect.bottom >= windowHeight){
        directionY *= -1;
    }
}

function float(){
    let currentLeft = parseFloat(message.style.left) || 0;
    let currentTop = parseFloat(message.style.top) || 0;
    
    message.style.left = (currentLeft + directionX) + 'px';
    message.style.top = (currentTop + directionY) + 'px';
}
function loop() {
    float();
    edgeDetector();
    requestAnimationFrame(loop);
}

window.addEventListener('resize', function() {
    windowHeight = window.innerHeight;
    windowWidth = window.innerWidth;
    message.style.left = '50px';
    message.style.top = '50px';
});

loop();