'use strict';

console.log('Setting initial values...');
// ============================================================================
// Initial declarations
// ============================================================================
// GAME
var gameStates = Object.freeze({
    CONNECTING: 0,
    START:      1,
    PAUSED:     2,
    END:        3
});
var isRunning = true;
var gameState = gameStates.START;
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

// PLAYERS AND OBJECTS
var players = [{
    name:   'testName',
    size:   40,
    x:      100,
    y:      100,
    acc:    0.005,
    speedX: 0,
    speedY: 0,
    points: 0,
    id:     'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            }),
    model:  new Image()
}];

var opponents = [];

// Target variables
var target = {
    id:     '00000000-0000-0000-0000-000000000000',
    x:      0,
    y:      0,
    size:   10
};
var currentTarget = 0;
var animationQueue = [];

// ============================================================================
//                                                         Initial declarations
// ============================================================================


// ============================================================================
// Launching of the game
// ============================================================================

function setPrep() {
    $('#menu').hide();
    $('canvas').show();
    gameInfo.innerHTML = "Drop an image on the canvas to use as your player model or click to start.";
}

function startGame() {
    gameInfo.innerHTML = "Connecting to game server...";
    gameState = gameStates.CONNECTING;
    ws = new WebSocket("ws://localhost:9000/websocket");
    // Start game when server connection is established
    ws.onopen = function(event) {
        console.log(players);
        // Tell server we have a player
        ws.send(JSON.stringify({
            message:    'start',
            players:     players
        }));
        /* Request current target from server
        ws.send(JSON.stringify({
            message:    'targetrequest',
            player:     player
        }));*/
    }
    // Receive messages from server
    ws.onmessage = function (event) {
        var reader = new FileReader();
        reader.addEventListener('loadend', function() {
            // TODO: Switch on message type and handle it
            var message = JSON.parse(reader.result);
            switch(message.message) {
                case 'newtarget':
                    if(message.target.Id !== target.id)
                        generateTarget(message.target);
                    break;
                case 'start':
                    gameInfo.innerHTML = "";
                    populateGame(message);
                    requestAnimationFrame(mainLoop);
                    break;
            }
            console.log(message);
        });
        reader.readAsBinaryString(event.data);
    }
    // Error in websocket communication
    ws.onerror = function (event) {
        console.log("ERROR: Error reported in WebSocket!");
        gameInfo.innerHTML = "There was en error connecting to the game server. Please try again later.";
        $('#menu').show();
        var reader = new FileReader();
        reader.addEventListener('loadend', function() {
            console.log(reader.result);
        });
        // If we fail to even connect there will be an error when trying to read event.
        try {
            reader.readAsBinaryString(event.data);
        }
        catch(e) {
            console.log(e);
        }
        
    }
}

// ============================================================================
//                                                        Launching of the game
// ============================================================================


// ============================================================================
// Running game logic
// ============================================================================
// POPULATE THE GAME WORLD WITH EXISTING ACTORS
function populateGame(message) {

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
        ws.send(JSON.stringify({
            message:    'endgame',
            players:     players
        }));
        ws.close(); /* TODO: Find out how to end this in a good way */
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
        players[0].speedY -= players[0].acc*delta;
    } 
    if (Key.isDown(Key.LEFT)) {
        players[0].speedX -= players[0].acc*delta;
    }
    if (Key.isDown(Key.DOWN)) {
        players[0].speedY += players[0].acc*delta;
    }
    if (Key.isDown(Key.RIGHT)) {
        players[0].speedX += players[0].acc*delta;
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
    players[0].y += players[0].speedY;
    players[0].x += players[0].speedX;
    // Retardation
    if (players[0].speedX < 0.01 && players[0].speedX > -0.01)
        players[0].speedX = 0;
    else
        players[0].speedX -= (players[0].speedX > 0) ? players[0].acc/2*delta : (players[0].acc/2)*-1*delta;
    if (players[0].speedY < 0.01 && players[0].speedY > -0.01)
        players[0].speedY = 0;
    else
        players[0].speedY -= (players[0].speedY > 0) ? players[0].acc/2*delta : (players[0].acc/2)*-1*delta;

    checkGameBoundaries();
    checkTargetCollision();

    // Update server with our player and target if socket is open
    if(ws.readyState === 1) {
        ws.send(JSON.stringify({
            message:    'tick',
            players:     [{
                name:       players[0].name,
                size:       players[0].size,
                x:          players[0].x,
                y:          players[0].y,
                acc:        players[0].acc,
                speedX:     players[0].speedX,
                speedY:     players[0].speedY,
                points:     players[0].points,
                id:         players[0].id,
                model:      '' // Don't send model again... Images can be large, yo.
            }],
            target:     {
                id:         target.id, 
                x:          0, 
                y:          0, 
                size:       10} /* x, y, size not important on server side */
        }));
    }
}

// Don't allow exiting the game boundaries. Bounce back.
function checkGameBoundaries() {
    if((players[0].y + players[0].size <= players[0].size && players[0].speedY < 0) || (players[0].y >= cnv.height - players[0].size && players[0].speedY > 0))
        players[0].speedY = -1*players[0].speedY/2;
    if((players[0].x + players[0].size <= players[0].size && players[0].speedX < 0) || (players[0].x >= cnv.width - players[0].size && players[0].speedX > 0))
        players[0].speedX = -1*players[0].speedX/2;
}

function checkTargetCollision() {
    var xDiff = Math.abs(players[0].x + players[0].size/2 - target['x']);
    var yDiff = Math.abs(players[0].y + players[0].size/2 - target['y']);
    if(xDiff < target['size'] && yDiff < target['size']) {
        players[0].points++;
        ws.send(JSON.stringify({
            message:    'registerpoint',
            players:     [{
                name:       players[0].name,
                size:       players[0].size,
                x:          players[0].x,
                y:          players[0].y,
                acc:        players[0].acc,
                speedX:     players[0].speedX,
                speedY:     players[0].speedY,
                points:     players[0].points,
                id:         players[0].id,
                model:      '' // Don't send model again... Images can be large, yo.
            }],
            target:     {id: target.id, x: 0, y: 0, size: 10}
        }));
        animationQueue.push({
            start: Date.now(),
            end: Date.now() + 2000,
            type: 'text',
            value: '+1 point',
            x: players[0].x,
            y: players[0].y
        });
    }
}

function generateTarget(newTarget) {
    console.log("Generating new target...");
    target = {
        id:     newTarget.Id,
        x:      cnv.width * (newTarget.X / 100),
        y:      cnv.height * (newTarget.Y / 100),
        size:   newTarget.Size
    };
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

// ============================================================================
//                                                           Running game logic
// ============================================================================


// ============================================================================
// Drawing functionality
// ============================================================================
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
    if(players[0].model.src)
        ctx.drawImage(players[0].model, players[0].x, players[0].y, players[0].size, players[0].size);
    else
        setDefaultPlayerModel(); // We drop a frame to set model
}

function setDefaultPlayerModel() {
    players[0].model.src = "player.png";
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
    ctx.fillText(players[0].points, 30, 40);
    /* TODO: Make scoreboard */
}
// ============================================================================
//                                                        Drawing functionality
// ============================================================================

// ============================================================================
// Input control
// ============================================================================
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
    players[0].speedX += Math.round(event.accelerationIncludingGravity.x*10) / 400;  
    players[0].speedY -= Math.round(event.accelerationIncludingGravity.y*10) / 400;
}

$('canvas').hide();

// Click or tap the canvas for start/toggle
$('canvas').bind('click tap', function(e) {
    if(gameState === gameStates.START) {
        startGame();
    }
    else {
        toggleRun();
    }
})
// ============================================================================
//                                                                Input control
// ============================================================================

// ============================================================================
// Utilities (Drag and drop etc.)
// ============================================================================
// ===================================
// Thanks to: http://www.htmlgoodies.com/html5/javascript/drag-files-into-the-browser-from-the-desktop-HTML5.html
// for the drag and drop image code.
// ===================================
function addEventHandler(obj, evt, handler) {
    if(obj.addEventListener) {
        // W3C method
        obj.addEventListener(evt, handler, false);
    } else if(obj.attachEvent) {
        // IE method.
        obj.attachEvent('on'+evt, handler);
    } else {
        // Old school method.
        obj['on'+evt] = handler;
    }
}

Function.prototype.bindToEventHandler = function bindToEventHandler() {
    var handler = this;
    var boundParameters = Array.prototype.slice.call(arguments);
    //create closure
    return function(e) {
        e = e || window.event; // get window.event if e argument missing (in IE)   
        boundParameters.unshift(e);
        handler.apply(this, boundParameters);
    }
};

if(window.FileReader) { 
    addEventHandler(window, 'load', function() {
        var status = document.getElementById('gameinfo');
        var drop   = document.getElementById('cnv');

        function cancel(e) {
            if (e.preventDefault) { e.preventDefault(); }
            return false;
        }

        // Tells the browser that we *can* drop on this target
        addEventHandler(drop, 'dragover', cancel);
        addEventHandler(drop, 'dragenter', cancel);
        addEventHandler(drop, 'drop', function (e) {
            e = e || window.event; // get window.event if e argument missing (in IE)   
            if (e.preventDefault) { e.preventDefault(); } // stops the browser from redirecting off to the image.

            var dt    = e.dataTransfer;
            var files = dt.files;
            for (var i=0; i<files.length; i++) {
                var file = files[i];
                var reader = new FileReader();

                addEventHandler(reader, 'loadend', function(e, file) {
                    var bin           = this.result; 
                    var newFile       = document.createElement('div');
                    newFile.innerHTML = 'Loaded : '+file.name+' size '+file.size+' B';

                    var img = document.createElement("img"); 
                    img.file = file;   
                    img.src = bin;
                    players[0].model = img;
                }.bindToEventHandler(file));

                reader.readAsDataURL(file);
            }
            return false;
        });
    });
} else { 
    document.getElementById('status').innerHTML = 'Your browser does not support the HTML5 FileReader.';
}

// ============================================================================
//                                               Utilities (Drag and drop etc.)
// ============================================================================