/* ========================================
   CONTACT-CARD.JS — About page flip animation
   Clicking the contact button flips it
   horizontally and expands into a business card
   ======================================== */

(function () {
  'use strict';

  var btn = document.getElementById('contactBtn');
  var overlay = document.getElementById('contactOverlay');
  var wrapper = document.getElementById('contactCardWrapper');
  var closeBtn = document.getElementById('contactClose');

  if (!btn || !overlay || !wrapper) return;

  var isOpen = false;
  var isAnimating = false;

  // Open: position the card wrapper over the button, then animate to center
  btn.addEventListener('click', function () {
    if (isOpen || isAnimating) return;
    isAnimating = true;

    // Pause floating animation so button stays still for position capture
    if (window._contactFloat) window._contactFloat.pause();

    // Get button position to start the card from there
    var rect = btn.getBoundingClientRect();

    // Position wrapper at the button's location initially
    wrapper.style.position = 'fixed';
    wrapper.style.left = rect.left + 'px';
    wrapper.style.top = rect.top + 'px';
    wrapper.style.width = rect.width + 'px';
    wrapper.style.height = rect.height + 'px';
    wrapper.style.transition = 'none';

    // Show overlay (transparent initially)
    overlay.style.display = 'flex';
    overlay.style.background = 'rgba(26, 45, 20, 0)';
    overlay.style.pointerEvents = 'auto';

    // Force reflow
    void wrapper.offsetHeight;

    // Calculate center position for expanded card
    var isMobile = window.innerWidth <= 768;
    var targetW = isMobile ? Math.min(360, window.innerWidth * 0.92) : Math.min(640, window.innerWidth * 0.9);
    var targetH = isMobile ? Math.min(520, window.innerHeight * 0.85) : Math.min(380, window.innerHeight * 0.8);
    var centerLeft = (window.innerWidth - targetW) / 2;
    var centerTop = (window.innerHeight - targetH) / 2;

    // Animate wrapper to center + expanded size
    wrapper.style.transition =
      'left 0.55s cubic-bezier(0.16, 1, 0.3, 1), ' +
      'top 0.55s cubic-bezier(0.16, 1, 0.3, 1), ' +
      'width 0.55s cubic-bezier(0.16, 1, 0.3, 1), ' +
      'height 0.55s cubic-bezier(0.16, 1, 0.3, 1)';

    // Animate the overlay background
    overlay.style.transition = 'background 0.4s ease';
    overlay.style.background = 'rgba(26, 45, 20, 0.5)';

    // Animate to center + flip
    requestAnimationFrame(function () {
      wrapper.style.left = centerLeft + 'px';
      wrapper.style.top = centerTop + 'px';
      wrapper.style.width = targetW + 'px';
      wrapper.style.height = targetH + 'px';

      overlay.classList.add('active');
    });

    // Mark open after animation
    setTimeout(function () {
      isOpen = true;
      isAnimating = false;
    }, 600);
  });

  // Close: reverse animation back to button position
  function closeCard() {
    if (!isOpen || isAnimating) return;
    isAnimating = true;

    // Get the button's current position
    var rect = btn.getBoundingClientRect();

    // Remove the flip (back to front face)
    overlay.classList.remove('active');
    overlay.classList.add('closing');

    // Animate overlay bg out
    overlay.style.transition = 'background 0.4s ease 0.2s';
    overlay.style.background = 'rgba(26, 45, 20, 0)';

    // Animate wrapper back to the button's position
    wrapper.style.transition =
      'left 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, ' +
      'top 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, ' +
      'width 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, ' +
      'height 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s';

    wrapper.style.left = rect.left + 'px';
    wrapper.style.top = rect.top + 'px';
    wrapper.style.width = rect.width + 'px';
    wrapper.style.height = rect.height + 'px';

    // After animation completes, hide everything
    setTimeout(function () {
      overlay.style.display = 'none';
      overlay.classList.remove('closing');
      overlay.style.pointerEvents = 'none';

      // Reset wrapper styles
      wrapper.style.transition = 'none';

      isOpen = false;
      isAnimating = false;

      // Resume floating animation
      if (window._contactFloat) window._contactFloat.resume();
    }, 800);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeCard();
    });
  }

  // Close on overlay click (outside the card)
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      closeCard();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      closeCard();
    }
  });
})();
