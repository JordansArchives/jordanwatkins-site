/* ========================================
   CHARACTER-ROTATE.JS — Expression cycling
   Randomly rotates between character frames
   at varying intervals for a lively feel
   ======================================== */

(function () {
  'use strict';

  var container = document.getElementById('hubCharacter');
  if (!container) return;

  var frames = Array.from(container.querySelectorAll('.hub-character-img'));
  if (frames.length < 2) return;

  var currentIndex = 0;

  // Random interval between switches (1.5s – 4.5s)
  function getRandomDelay() {
    return 1500 + Math.random() * 3000;
  }

  // Pick a random frame that isn't the current one
  function getRandomFrame() {
    var next;
    do {
      next = Math.floor(Math.random() * frames.length);
    } while (next === currentIndex);
    return next;
  }

  function switchFrame() {
    var nextIndex = getRandomFrame();

    // Swap in one frame — show new FIRST, then hide old
    frames[nextIndex].classList.add('active');
    frames[currentIndex].classList.remove('active');

    currentIndex = nextIndex;

    // Schedule next switch at a random interval
    setTimeout(switchFrame, getRandomDelay());
  }

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Just show the first frame
  }

  // Start the cycle after initial delay
  setTimeout(switchFrame, getRandomDelay());
})();
