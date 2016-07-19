'use strict';

console.log('Setting initial values...');
// Initial declarations
var isRunning = true;
var cnv = document.getElementById('cnv');
cnv.width = window.innerWidth;
cnv.height = window.innerHeight;
var ctx = cnv.getContext("2d");
/* Set origo in the center of the canvas*/
//ctx.translate(cnv.width/2, cnv.height/2);
var delta = 0;
var lastTimeCalled = 0;
var maxFPS = 60;
var frameID;

var testVar = 20, testX = 100, testY = 100, testAcc = 0.003, testSpeedX = 0, testSpeedY = 0;
var testStep = 0.1;
var testSig = 'pos';

// The main game loop
function mainLoop(timecalled) {
    // Don't do work if it's not time yet
    if (timecalled < lastTimeCalled + (1000 / maxFPS)) {
        frameID = requestAnimationFrame(mainLoop);
        return;
    }
    delta = timecalled - lastTimeCalled; // get the delta time since last frame
    lastTimeCalled = timecalled;

    update(delta);
    drawCanvas();
    frameID = requestAnimationFrame(mainLoop);
}

// Updates the state
function update(delta) {
    
    updateMovement(delta);

    updatePositions(delta);

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
        testSpeedY -= testAcc*delta;
    } 
    if (Key.isDown(Key.LEFT)) {
        testSpeedX -= testAcc*delta*2; // Horizontal acceleration feels sluggish
    }
    if (Key.isDown(Key.DOWN)) {
        testSpeedY += testAcc*delta;
    }
    if (Key.isDown(Key.RIGHT)) {
        testSpeedX += testAcc*delta*2; // Horizontal acceleration feels sluggish
    }
}

// Change positional state based on speed
function updatePositions(delta) {
    testY += testSpeedY;
    testX += testSpeedX;
    // Retardation
    if (testSpeedX < 0.01 && testSpeedX > -0.01)
        testSpeedX = 0;
    else
        testSpeedX -= (testSpeedX > 0) ? testAcc/2*delta : (testAcc/2)*-1*delta;
    if (testSpeedY < 0.01 && testSpeedY > -0.01)
        testSpeedY = 0;
    else
        testSpeedY -= (testSpeedY > 0) ? testAcc/2*delta : (testAcc/2)*-1*delta;

    checkGameBoundaries();
}

// Don't allow exiting the game boundaries. Bounce back.
function checkGameBoundaries() {
    if((testY <= 10 && testSpeedY < 0) || (testY >= cnv.height - 10 && testSpeedY > 0))
        testSpeedY = -1*testSpeedY/2;
    if((testX <= 0 && testSpeedX < 0) || (testX >= cnv.width - 150 && testSpeedX > 0))
        testSpeedX = -1*testSpeedX/2;
}

// Draws the canvas according to state
function drawCanvas() {
    // Clear area for fresh drawing
    ctx.clearRect(0, 0, cnv.width, cnv.height);
    // Make sure canvas is exactly full browser size 
    cnv.width = window.innerWidth;
    cnv.height = window.innerHeight;
    // Draw objects!
    ctx.strokeRect(testX, testY - testVar/2, 150, testVar);
}

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

// RUN! Starts the 'game'...
requestAnimationFrame(mainLoop);
