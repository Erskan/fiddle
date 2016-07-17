'use strict';

console.log('Setting initial values...');
// Initial declarations
var isRunning = true;
var cnv = document.getElementById('cnv');
var ctx = cnv.getContext("2d");
ctx.translate(cnv.width/2, cnv.height/2);
var delta = 0;
var lastTimeCalled = 0;
var maxFPS = 60;
var frameID;

var testVar = 20;
var testStep = 0.1;
var testSig = 'pos';

// The main game loop
function mainLoop(timecalled) {
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
    if(testVar <= 20) {
        testVar += testStep*delta;
        testSig = 'pos';
    }else if(testVar >= 50) {
        testVar -= testStep*delta;
        testSig = 'neg';
    }else if(testSig === 'pos') {
        testVar += testStep*delta;
    }else if(testSig === 'neg') {
        testVar -= testStep*delta;
    }
}

// Draws the canvas according to state
function drawCanvas() {
    ctx.clearRect((cnv.width/2)*-1, (cnv.height/2)*-1, cnv.width, cnv.height);
    ctx.rotate(Math.PI*2/600);
    ctx.strokeRect(-75, 0 - testVar/2, 150, testVar);
}

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

// RUN! Starts the 'game'...
requestAnimationFrame(mainLoop);
