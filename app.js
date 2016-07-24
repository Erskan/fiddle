'use strict';

console.log('Setting initial values...');
// Initial declarations
// GAME
var gameStates = Object.freeze({
    START: 0,
    TIMED: 1,
    END: 2
});
var isRunning = true;
var gameState = gameStates.START;
var gameTime = Date.now(), gameEnd = Date.now() + 15000;

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
var playerSize = 20, playerX = 100, playerY = 100, playerAcc = 0.003, playerSpeedX = 0, playerSpeedY = 0;
// Target variables
var target = generateTarget();
var currentTarget = 0;
var animationQueue = [];

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

    //checkTimer();

    /*Pulsation*/
    /*if(testVar <= 20) {
        testVar += testStep*delta;
        testSig = 'pos';
    }else if(testVar >= 50) {
        testVar -= testStep*delta;
        testSig = 'neg';
    }else if(testSig === 'pos') {
        testVar += testStep*delta;
    }else if(testSig === 'neg') {
        testVar -= testStep*delta;
    }*/
}

function updateMovement(delta) {
    if (Key.isDown(Key.UP)) {
        playerSpeedY -= playerAcc*delta;
    } 
    if (Key.isDown(Key.LEFT)) {
        playerSpeedX -= playerAcc*delta*2; // Horizontal acceleration feels sluggish
    }
    if (Key.isDown(Key.DOWN)) {
        playerSpeedY += playerAcc*delta;
    }
    if (Key.isDown(Key.RIGHT)) {
        playerSpeedX += playerAcc*delta*2; // Horizontal acceleration feels sluggish
    }
}

function updateAnimations(delta) {
    if(animationQueue.length > 0) {
        animationQueue.forEach(function(obj) {
            if(obj.end < Date.now()) {
                animationQueue.splice(animationQueue.indexOf(obj), 1);
                return;
            }
            
        }, this);
    }
}

// Change positional state based on speed
function updatePositions(delta) {
    playerY += playerSpeedY;
    playerX += playerSpeedX;
    // Retardation
    if (playerSpeedX < 0.01 && playerSpeedX > -0.01)
        playerSpeedX = 0;
    else
        playerSpeedX -= (playerSpeedX > 0) ? playerAcc/2*delta : (playerAcc/2)*-1*delta;
    if (playerSpeedY < 0.01 && playerSpeedY > -0.01)
        playerSpeedY = 0;
    else
        playerSpeedY -= (playerSpeedY > 0) ? playerAcc/2*delta : (playerAcc/2)*-1*delta;

    checkGameBoundaries();
    checkTargetCollision();
}

// Don't allow exiting the game boundaries. Bounce back.
function checkGameBoundaries() {
    if((playerY <= playerSize && playerSpeedY < 0) || (playerY >= cnv.height - playerSize && playerSpeedY > 0))
        playerSpeedY = -1*playerSpeedY/2;
    if((playerX <= playerSize && playerSpeedX < 0) || (playerX >= cnv.width - playerSize && playerSpeedX > 0))
        playerSpeedX = -1*playerSpeedX/2;
}

function checkTargetCollision() {
    var xDiff = Math.abs(playerX - target['x']);
    var yDiff = Math.abs(playerY - target['y']);
    if(xDiff < target['size'] && yDiff < target['size']) {
        currentTarget++;
        target = generateTarget();
        gameEnd += 2000;
        animationQueue.push({
            start: Date.now(),
            end: Date.now() + 2000,
            type: 'text',
            value: '2+',
            x: playerX,
            y: playerY
        });
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
    ctx.arc(playerX, playerY, playerSize, 0, 2 * Math.PI, false);
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
    cancelAnimationFrame(frameID);
}

function startRun() {
    frameID = requestAnimationFrame(function(timestamp) {
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

// SMARTPHONE - Use the accelerometer if possible
window.ondevicemotion = function(event) {
    playerSpeedX += Math.round(event.accelerationIncludingGravity.x*10) / 400;  
    playerSpeedY -= Math.round(event.accelerationIncludingGravity.y*10) / 400;
}

// RUN! Starts the 'game'...
gameState = gameStates.TIMED;
requestAnimationFrame(mainLoop);
