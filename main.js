import { MainScene } from "./scenes/MainScene.js";
import { SliceTestScene } from "./scripts/SliceTestScene.js";

// Detect if mobile device
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

// Get actual screen dimensions
// const screenWidth = window.innerWidth;
// const screenHeight = window.innerHeight;

const getGameDimensions = () => {
  // On mobile, use window.innerWidth/Height for accurate viewport size
  return {
      width: window.innerWidth,
      height: window.innerHeight
  };
};

// Get dimensions after a small delay to ensure viewport is ready (especially on mobile)
let dimensions = getGameDimensions();

// Re-get dimensions after DOM is ready (mobile browsers sometimes report wrong size initially)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
      dimensions = getGameDimensions();
  });
} else {
  // Small delay to ensure mobile viewport is correct
  setTimeout(() => {
      dimensions = getGameDimensions();
  }, 100);
}

const rawDPR = window.devicePixelRatio || 1;
const MAX_DPR = 4; // Allow up to 4x for very high-DPI mobile screens
const dpr = Math.min(rawDPR, MAX_DPR);

const baseHeight = 1080;
const baseGravity = 300;
const gravityScale = dimensions.height / baseHeight;
const responsiveGravity = baseGravity * gravityScale;

const config = {
  type: Phaser.AUTO,
  width: dimensions.width,
  height: dimensions.height,
  backgroundColor: "#222",
  // High DPR support for crisp graphics on retina/high DPR screens
  // Cap DPR at 4x to prevent performance issues on extreme high-DPI devices
  resolution: dpr,
  antialias: true, // Enable antialiasing for smoother edges
  pixelArt: false, // Set to false to allow smooth scaling (not pixel art style)
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: responsiveGravity },
      debug: false,
    },
  },
  plugins: {
    global: [
      {
        key: "RawgesturePlugin",
        plugin: Phaser.Plugins.RawgesturePlugin,
        start: true,
      },
    ],
  },
  scene: MainScene,
  // scale: {
  //     mode: Phaser.Scale.RESIZE,
  //     autoCenter: Phaser.Scale.CENTER_BOTH,
  //     width: '100%',
  //     height: '100%'
  // },
  scale: {
    // mode: Phaser.Scale.RESIZE,  // Resize to fit container
    autoCenter: Phaser.Scale.NO_CENTER, // Don't center - let canvas fill container naturally
    resizeInterval: 0 // Check resize every frame (0 = every frame)
},

  // render: {
  //   // Enable high DPR rendering
  //   antialias: true,
  //   pixelArt: false,
  //   roundPixels: false, // Round pixels for crisp rendering on high-DPI displays
  //   powerPreference: "high-performance", // Use high-performance GPU if available
  // },
};

const game = new Phaser.Game(config);

// // Make game instance globally accessible for fullscreen
// window.gameInstance = game;

// // Handle window resize
// window.addEventListener("resize", () => {
//   game.scale.resize(window.innerWidth, window.innerHeight);
// });

// // Lock orientation on mobile
// if (isMobile) {
//   // Try to lock orientation (may not work on all browsers)
//   if (screen.orientation && screen.orientation.lock) {
//     screen.orientation.lock("landscape").catch((err) => {
//       console.log("Orientation lock failed:", err);
//     });
//   }
// }


/**
 * Ensures Phaser's canvas is properly configured for high-DPI displays
 * This fixes blurriness on mobile devices by ensuring the canvas
 * uses the correct device pixel ratio
 */
function ensureCrispCanvas() {
  // Wait for Phaser to fully initialize
  if (game.isBooted) {
      applyCrispCanvasFix();
  } else {
      game.events.once('ready', applyCrispCanvasFix);
  }
}

function applyCrispCanvasFix() {
  const canvas = game.canvas;
  if (!canvas) return false;

  // CRITICAL FIX: Manually apply resolution scaling
  // Phaser.Scale.RESIZE mode doesn't always apply resolution correctly
  const dpr = config.resolution || window.devicePixelRatio || 1;
  
  // Get FULL container size - use visualViewport API on mobile if available
  // This accounts for browser chrome (address bar, etc.) on mobile
  const container = document.getElementById('game-container');
  let windowWidth, windowHeight;
  
  // Use visualViewport API if available (more accurate on mobile)
  if (window.visualViewport) {
      windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
      windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
  } else {
      windowWidth = window.innerWidth;
      windowHeight = window.innerHeight;
  }
  
  // Also check documentElement for fallback
  const docWidth = document.documentElement.clientWidth;
  const docHeight = document.documentElement.clientHeight;
  windowWidth = Math.max(windowWidth, docWidth);
  windowHeight = Math.max(windowHeight, docHeight);
  
  const containerWidth = container ? Math.max(container.clientWidth, windowWidth) : windowWidth;
  const containerHeight = container ? Math.max(container.clientHeight, windowHeight) : windowHeight;
  
  // ALWAYS use the largest size available (ensures full screen on mobile)
  const displayWidth = Math.max(windowWidth, containerWidth);
  const displayHeight = Math.max(windowHeight, containerHeight);
  
  // Validate dimensions before proceeding
  if (!displayWidth || !displayHeight || displayWidth <= 0 || displayHeight <= 0 || isNaN(displayWidth) || isNaN(displayHeight)) {
      return false; // Not ready yet
  }
  
  // Calculate expected internal size
  const internalWidth = Math.round(displayWidth * dpr);
  const internalHeight = Math.round(displayHeight * dpr);
  
  // Validate calculated sizes
  if (isNaN(internalWidth) || isNaN(internalHeight) || internalWidth <= 0 || internalHeight <= 0) {
      return false;
  }
  
  // Force update - Phaser RESIZE mode keeps resetting it
  // Check if canvas needs updating (internal size OR CSS size not 100%)
  const needsUpdate = canvas.width !== internalWidth || 
                      canvas.height !== internalHeight || 
                      canvas.style.width !== '100%' || 
                      canvas.style.height !== '100%';
  
  if (needsUpdate) {

      return true;
  }
  return false;
}

// Continuously monitor and fix canvas resolution (Phaser RESIZE mode resets it)
// Optimized to reduce performance impact
let lastMonitorTime = 0;
const MONITOR_INTERVAL = 500; // Check every 500ms instead of every frame

function monitorCanvasResolution() {
  const now = Date.now();
  // Throttle monitoring to reduce lag
  if (now - lastMonitorTime < MONITOR_INTERVAL) {
      return;
  }
  lastMonitorTime = now;
  
  if (!game || !game.canvas) return;
  
  const canvas = game.canvas;
  const dpr = config.resolution || window.devicePixelRatio || 1;
  
  // Use FULL window size for display (ensures full screen on mobile)
  const displayWidth = window.innerWidth;
  const displayHeight = window.innerHeight;
  
  // Validate before checking
  if (!displayWidth || !displayHeight || displayWidth <= 0 || displayHeight <= 0) {
      return;
  }
  
  const expectedInternalWidth = Math.round(displayWidth * dpr);
  const expectedInternalHeight = Math.round(displayHeight * dpr);
  
  // Quick check - only fix if actually needed
  const needsSizeFix = canvas.style.width !== '100%' || canvas.style.height !== '100%';
  const currentResolution = canvas.clientWidth > 0 ? canvas.width / canvas.clientWidth : 1;
  const needsResolutionFix = Math.abs(currentResolution - dpr) > 0.1;
  
  if (needsResolutionFix || needsSizeFix) {
      // Update Phaser's game size to internal resolution
      if (game.scale) {
          game.scale.setGameSize(expectedInternalWidth, expectedInternalHeight);
          if (game.scale.displaySize) {
              game.scale.displaySize.setSize(displayWidth, displayHeight);
          }
      }
      
      // Set canvas internal size
      canvas.width = expectedInternalWidth;
      canvas.height = expectedInternalHeight;
      
      // Set canvas display size to 100% (fill container)
      canvas.style.setProperty('width', '100%', 'important');
      canvas.style.setProperty('height', '100%', 'important');
      canvas.style.setProperty('display', 'block', 'important');
      canvas.style.setProperty('position', 'absolute', 'important');
      canvas.style.setProperty('top', '0', 'important');
      canvas.style.setProperty('left', '0', 'important');
      canvas.style.setProperty('margin', '0', 'important');
      canvas.style.setProperty('padding', '0', 'important');
      
      // Update renderer
      if (game.renderer) {
          if (game.renderer.gl) {
              game.renderer.gl.viewport(0, 0, expectedInternalWidth, expectedInternalHeight);
          }
          if (game.renderer.resize) {
              game.renderer.resize(expectedInternalWidth, expectedInternalHeight);
          }
      }
  }
}

// Apply crisp canvas fix after initialization
ensureCrispCanvas();

// Continuously monitor canvas resolution (Phaser RESIZE mode resets it)
// Use requestAnimationFrame to check every frame
let lastCheckTime = 0;
let fixAttempts = 0;
const MAX_FIX_ATTEMPTS = 50; // Stop after 50 successful fixes to avoid spam

function checkCanvasResolution() {
  const now = Date.now();
  // Check every 200ms (less frequent to reduce lag) and stop after fixes are applied
  if (now - lastCheckTime > 200 && fixAttempts < MAX_FIX_ATTEMPTS) {
      const canvas = game.canvas;
      if (canvas) {
          // CRITICAL: Always ensure canvas style is 100% (Phaser keeps resetting it)
          if (canvas.style.width !== '100%' || canvas.style.height !== '100%') {
              canvas.style.setProperty('width', '100%', 'important');
              canvas.style.setProperty('height', '100%', 'important');
              canvas.style.setProperty('position', 'absolute', 'important');
              canvas.style.setProperty('top', '0', 'important');
              canvas.style.setProperty('left', '0', 'important');
          }
      }
      
      const fixed = applyCrispCanvasFix();
      if (fixed) {
          fixAttempts++;
      }
      // Only call monitorCanvasResolution if we haven't reached max attempts
      if (fixAttempts < MAX_FIX_ATTEMPTS) {
          monitorCanvasResolution();
      }
      lastCheckTime = now;
  }
  // Only continue monitoring if we haven't reached max attempts
  if (fixAttempts < MAX_FIX_ATTEMPTS) {
      requestAnimationFrame(checkCanvasResolution);
  }
}

// Ensure container is exactly full screen
function ensureContainerFullScreen() {
  const container = document.getElementById('game-container');
  if (container) {
      // Get the largest possible size (account for mobile browser chrome)
      let vw = window.innerWidth;
      let vh = window.innerHeight;
      
      if (window.visualViewport) {
          vw = Math.max(vw, window.visualViewport.width);
          vh = Math.max(vh, window.visualViewport.height);
      }
      
      const docW = document.documentElement.clientWidth;
      const docH = document.documentElement.clientHeight;
      vw = Math.max(vw, docW);
      vh = Math.max(vh, docH);
      
      // Force container to exact viewport size
      container.style.width = vw + 'px';
      container.style.height = vh + 'px';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.right = '0';
      container.style.bottom = '0';
      container.style.margin = '0';
      container.style.padding = '0';
  }
}

// Run immediately
ensureContainerFullScreen();
window.addEventListener('resize', ensureContainerFullScreen);
window.addEventListener('orientationchange', () => {
  setTimeout(ensureContainerFullScreen, 100);
});

// Start monitoring after game is ready
game.events.once('ready', () => {
  // Ensure container is full screen
  ensureContainerFullScreen();
  
  // CRITICAL: Force Phaser to use full window size immediately
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  game.scale.resize(windowWidth, windowHeight);
  
  // Wait for canvas to get proper dimensions, then apply fix with retries
  let attempts = 0;
  const tryFix = () => {
      // Force resize to window size before applying fix
      game.scale.resize(window.innerWidth, window.innerHeight);
      
      const fixed = applyCrispCanvasFix();
      if (!fixed && attempts < 20) {
          attempts++;
          setTimeout(tryFix, 50); // Retry every 50ms (faster)
      } else {
          // Start continuous monitoring (always start, even if initial fix failed)
          requestAnimationFrame(checkCanvasResolution);
      }
  };
  
  // Start trying immediately, then also after a delay
  setTimeout(tryFix, 100);
  setTimeout(tryFix, 300);
  setTimeout(tryFix, 500);
});

// Handle window resize - ensure Phaser uses full window size
window.addEventListener('resize', () => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Force Phaser to resize to full window size
  game.scale.resize(windowWidth, windowHeight);
  
  // Re-apply crisp canvas fix on resize (critical for maintaining resolution)
  setTimeout(() => {
      applyCrispCanvasFix();
  }, 50);
});

// Handle orientation change on mobile
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      game.scale.resize(windowWidth, windowHeight);
      setTimeout(() => {
          applyCrispCanvasFix();
      }, 100);
  }, 100);
});

// Also hook into Phaser's resize events
game.scale.on('resize', () => {
  setTimeout(() => {
      applyCrispCanvasFix();
  }, 10);
});

// Expose game instance for HTML interaction
window.gameInstance = game;

// Debug: Log renderer type to verify WebGL is being used
// Delay debug to run AFTER our fix applies
game.events.once('ready', () => {
// Wait for our fix to apply, then log
setTimeout(() => {
// Check what renderer AUTO actually chose
const actualRenderer = game.renderer;
const rendererType = actualRenderer ? actualRenderer.type : 'N/A';

let rendererName = 'UNKNOWN';
if (rendererType === Phaser.WEBGL || rendererType === 1) {
  rendererName = 'WEBGL ✅';
} else if (rendererType === Phaser.CANVAS || rendererType === 0) {
  rendererName = 'CANVAS ⚠️';
} else if (rendererType === Phaser.AUTO || rendererType === 2) {
  // AUTO means it will try WEBGL first - check what it actually used
  const gl = actualRenderer.gl;
  rendererName = gl ? 'WEBGL ✅ (via AUTO)' : 'CANVAS ⚠️ (via AUTO)';
}

// Check actual canvas resolution (this is what matters for rendering)
const canvas = game.canvas;
const canvasWidth = canvas ? canvas.width : 'N/A';
const canvasHeight = canvas ? canvas.height : 'N/A';
const canvasStyleWidth = canvas ? canvas.style.width : 'N/A';
const canvasStyleHeight = canvas ? canvas.style.height : 'N/A';

// Get computed display size (actual rendered size)
const computedStyle = canvas ? window.getComputedStyle(canvas) : null;
const computedWidth = computedStyle ? computedStyle.width : 'N/A';
const computedHeight = computedStyle ? computedStyle.height : 'N/A';
const clientWidth = canvas ? canvas.clientWidth : 'N/A';
const clientHeight = canvas ? canvas.clientHeight : 'N/A';

// Calculate actual resolution being used (internal size / display size)
const actualResolution = canvas && clientWidth !== 'N/A' && clientWidth > 0
  ? (canvasWidth / clientWidth).toFixed(3)
  : 'N/A';

const container = document.getElementById('game-container');
const containerW = container ? container.clientWidth : 'N/A';
const containerH = container ? container.clientHeight : 'N/A';

console.log('=== Phaser Rendering Info ===');
console.log('Window Size:', window.innerWidth, '×', window.innerHeight, '(viewport)');
console.log('Container Size:', containerW, '×', containerH);
console.log('Config Renderer Type:', config.type === Phaser.AUTO ? 'AUTO (2)' : config.type);
console.log('Actual Renderer:', rendererName, `(type: ${rendererType})`);
console.log('Device Pixel Ratio:', window.devicePixelRatio);
console.log('Config Resolution:', config.resolution, '(this is what we set)');
console.log('Canvas Resolution:', actualResolution, '(actual resolution being used)');
console.log('Canvas Size:', `${canvasWidth}×${canvasHeight} (internal pixels)`);
console.log('Canvas Style:', `${canvasStyleWidth} × ${canvasStyleHeight} (CSS style)`);
console.log('Canvas Computed:', `${computedWidth} × ${computedHeight} (computed CSS)`);
console.log('Canvas Client:', `${clientWidth} × ${clientHeight} (actual display size)`);
console.log('Phaser Game Size:', game.scale ? `${game.scale.gameSize.width}×${game.scale.gameSize.height}` : 'N/A');
console.log('Phaser Display Size:', game.scale && game.scale.displaySize ? `${game.scale.displaySize.width}×${game.scale.displaySize.height}` : 'N/A');
console.log('Round Pixels:', config.roundPixels);
console.log('Antialias:', config.antialias);
console.log('===========================');

// Warn if sizes don't match
if (clientWidth !== 'N/A' && Math.abs(clientWidth - window.innerWidth) > 1) {
  console.warn('⚠️ Canvas client width', clientWidth, 'does not match window width', window.innerWidth);
}
if (clientHeight !== 'N/A' && Math.abs(clientHeight - window.innerHeight) > 1) {
  console.warn('⚠️ Canvas client height', clientHeight, 'does not match window height', window.innerHeight);
}

// Warn if resolution doesn't match DPR
if (actualResolution !== 'N/A' && Math.abs(actualResolution - config.resolution) > 0.1) {
  console.warn('⚠️ Resolution mismatch! Config:', config.resolution, 'Actual:', actualResolution);
  console.warn('⚠️ Canvas may have been reset by Phaser. Monitoring will fix it.');
}
}, 500); // Wait 500ms for fix to apply
});

