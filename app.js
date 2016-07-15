(function() {
    'use strict';

    console.log('Setting initial values...');
    // Initial declarations
    var cnv = document.getElementById('cnv');
    var ctx = cnv.getContext("2d");
    ctx.translate(cnv.width/2, cnv.height/2);
    var delta = 0;
    var lastTimeCalled = 0;
    var maxFPS = 60;

    var testVar = 20;
    var testSig = 'pos';

    // The main game loop
    function mainLoop(timecalled) {
        if (timecalled < lastTimeCalled + (1000 / maxFPS)) {
            requestAnimationFrame(mainLoop);
            return;
        }
        delta = timecalled - lastTimeCalled; // get the delta time since last frame
        lastTimeCalled = timecalled;
        
        update(delta);
        drawCanvas();
        requestAnimationFrame(mainLoop);
    }

    // Updates the state
    function update(delta) {
        
        if(testVar === 20) {
            testVar++;
            testSig = 'pos';
        }else if(testVar === 50) {
            testVar--;
            testSig = 'neg';
        }else if(testSig === 'pos') {
            testVar++;
        }else if(testSig === 'neg') {
            testVar--;
        }
    }

    // Draws the canvas according to state
    function drawCanvas() {
        ctx.clearRect((cnv.width/2)*-1, (cnv.height/2)*-1, cnv.width, cnv.height);
        ctx.rotate(Math.PI*2/600);
        ctx.strokeRect(-75, 0 - testVar/2, 150, testVar);
    }

    // RUN! Starts the 'game'...
    requestAnimationFrame(mainLoop);

})();