'use strict';

console.log('Setting initial values...');
// Initial declarations
// GAME
var gameStates = Object.freeze({
    CONNECTING: 0,
    START:      1,
    TIMED:      2,
    PAUSED:     3,
    END:        4
});
var isRunning = true;
var gameState = gameStates.START;
var gameTime = Date.now(), gameEnd = Date.now() + 15000;
var gameInfo = document.getElementById("gameinfo");
var ws;

// CANVAS
var cnv = document.getElementById('cnv');
cnv.width = window.innerWidth;
cnv.height = window.innerHeight;
var ctx = cnv.getContext("2d");
/* Set origo in the center of the canvas*/
//ctx.translate(cnv.width/2, cnv.height/2);

// TIMING
var delta = 0;
var lastTimeCalled = 0;
var maxFPS = 60;
var frameID;

// PLAYER AND OBJECTS
var player = {
    size:   20,
    x:      100,
    y:      100,
    acc:    0.003,
    speedX: 0,
    speedY: 0
};
// Target variables
var target = generateTarget();
var currentTarget = 0;
var animationQueue = [];


function startGame() {
    gameState = gameStates.CONNECTING;
    ws = new WebSocket("ws://localhost:9000/websocket");
    // Start game when server connection is established
    ws.onopen = function(event) {
        gameState = gameStates.TIMED;
        requestAnimationFrame(mainLoop);
    }
    // Receive messages from server
    ws.onmessage = function (event) {
        var reader = new FileReader();
        reader.addEventListener('loadend', function() {
            console.log(reader.result);
        });
        reader.readAsBinaryString(event.data);
    }
}

// MAIN LOOP
function mainLoop(timecalled) {
    // Don't do work if it's not time yet
    if (timecalled < lastTimeCalled + (1000 / maxFPS)) {
        frameID = requestAnimationFrame(mainLoop);
        return;
    }
    delta = timecalled - lastTimeCalled; // get the delta time since last frame
    lastTimeCalled = timecalled;

    if(gameState === gameStates.END && isRunning) {
        toggleRun();
        ws.close();
        return;
    }

    update(delta);
    draw();
    frameID = requestAnimationFrame(mainLoop);
}

// Updates the state
function update(delta) {
    
    updateMovement(delta);

    updateAnimations(delta);

    updatePositions(delta);
}

function updateMovement(delta) {
    if (Key.isDown(Key.UP)) {
        player.speedY -= player.acc*delta;
    } 
    if (Key.isDown(Key.LEFT)) {
        player.speedX -= player.acc*delta*2; // Horizontal acceleration feels sluggish
    }
    if (Key.isDown(Key.DOWN)) {
        player.speedY += player.acc*delta;
    }
    if (Key.isDown(Key.RIGHT)) {
        player.speedX += player.acc*delta*2; // Horizontal acceleration feels sluggish
    }
}

function updateAnimations(delta) {
    if(animationQueue.length > 0) {
        animationQueue.forEach(function(obj) {
            if(obj.end < Date.now()) {
                animationQueue.splice(animationQueue.indexOf(obj), 1);
                return;
            }
            obj.y--;
            
        }, this);
    }
}

// Change positional state based on speed
function updatePositions(delta) {
    player.y += player.speedY;
    player.x += player.speedX;
    // Retardation
    if (player.speedX < 0.01 && player.speedX > -0.01)
        player.speedX = 0;
    else
        player.speedX -= (player.speedX > 0) ? player.acc/2*delta : (player.acc/2)*-1*delta;
    if (player.speedY < 0.01 && player.speedY > -0.01)
        player.speedY = 0;
    else
        player.speedY -= (player.speedY > 0) ? player.acc/2*delta : (player.acc/2)*-1*delta;

    checkGameBoundaries();
    checkTargetCollision();
}

// Don't allow exiting the game boundaries. Bounce back.
function checkGameBoundaries() {
    if((player.y <= player.size && player.speedY < 0) || (player.y >= cnv.height - player.size && player.speedY > 0))
        player.speedY = -1*player.speedY/2;
    if((player.x <= player.size && player.speedX < 0) || (player.x >= cnv.width - player.size && player.speedX > 0))
        player.speedX = -1*player.speedX/2;
}

function checkTargetCollision() {
    var xDiff = Math.abs(player.x - target['x']);
    var yDiff = Math.abs(player.y - target['y']);
    if(xDiff < target['size'] && yDiff < target['size']) {
        currentTarget++;
        target = generateTarget();
        gameEnd += 2000;
        animationQueue.push({
            start: Date.now(),
            end: Date.now() + 2000,
            type: 'text',
            value: '+2s',
            x: player.x,
            y: player.y
        });

        ws.send(JSON.stringify(player));
    }
}

function generateTarget() {
    return {
        id: currentTarget,
        size: 10,
        x: Math.floor(Math.random()*(cnv.width - 20)) + 20, // 20 = 2*radius
        y: Math.floor(Math.random()*(cnv.height - 20)) + 20
    };
}

// DRAWING
// Draws the canvas according to state
function draw() {
    // Clear area for fresh drawing
    ctx.clearRect(0, 0, cnv.width, cnv.height);
    // Make sure canvas is exactly full browser size 
    cnv.width = window.innerWidth;
    cnv.height = window.innerHeight;

    // Draw objects!
    drawPlayer();
    drawTargets();
    drawAnimations();
    drawGUI();
}

function drawPlayer() {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, 2 * Math.PI, false);
    ctx.strokeStyle = '#000000';
    ctx.stroke();
}

function drawTargets() {
    ctx.beginPath();
    ctx.arc(target['x'], target['y'], target['size'], 0, 2 * Math.PI, false);
    ctx.strokeStyle = '#ff00b0';
    ctx.stroke();
}

function drawAnimations() {
    animationQueue.forEach(function(obj) {
        switch(obj.type) {
            case 'text':
                ctx.font = '20pt Helvetica';
                ctx.fillText(obj.value, obj.x, obj.y);
                break;
            default:
                break;
        }
    });
}

function drawGUI() {
    ctx.font = '20pt Helvetica';
    ctx.fillText(currentTarget, 30, 40);
    gameTime = Date.now();
    if((gameEnd - gameTime)/1000 <= 0) {
        gameState = gameStates.END;
        return;
    }
    ctx.fillText((gameEnd - gameTime)/1000, cnv.width - 100, cnv.height - 40);
}

// SIMULATION CONTROL
// Toggles simulation of time
function toggleRun() {
    isRunning = isRunning ? false : true;
    if(isRunning) {
        startRun();
    }
    else {
        stopRun();
    }
}

function stopRun() {
    gameInfo.innerHTML = "GAME STOPPED";
    cancelAnimationFrame(frameID);
}

function startRun() {
    frameID = requestAnimationFrame(function(timestamp) {
        gameInfo.innerHTML = "";
        lastTimeCalled = timestamp;
        frameID = requestAnimationFrame(mainLoop);
    });
}

// KEYBOARD
// ===================================
// Thanks to: http://nokarma.org/2011/02/27/javascript-game-development-keyboard-input/
// for the key object help.
// ===================================
// Key object definition to help with managing key events
var Key = {
    _pressed: {},

    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    
    isDown: function(keyCode) {
        return this._pressed[keyCode];
    },
    
    onKeydown: function(event) {
        this._pressed[event.keyCode] = true;
    },
    
    onKeyup: function(event) {
        if(event.keyCode === Key.SPACE) toggleRun(); // Pause with SPACE. Should probably not be here...
        delete this._pressed[event.keyCode];
    }
};
// Wire the event listeners
window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);
window.addEventListener("devicemotion", onMotionChange, false);

// DEVICES WITH MOTIONSENSORS
function onMotionChange(event) {
    player.speedX += Math.round(event.accelerationIncludingGravity.x*10) / 400;  
    player.speedY -= Math.round(event.accelerationIncludingGravity.y*10) / 400;
}

// Click or tap the canvas for start/toggle
$('canvas').bind('click tap', function(e) {
    if(gameState === gameStates.START) {
        startGame();
    }
    else {
        toggleRun();
    }
})
