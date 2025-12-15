
const startPanel = document.getElementById("startPanel");
const startBtn = document.getElementById("startBtn");

// Function to request fullscreen
async function requestFullscreen() {
    // Try Phaser's built-in fullscreen first (if available)
    if (window.gameInstance && window.gameInstance.scale && window.gameInstance.scale.startFullscreen) {
        try {
            window.gameInstance.scale.startFullscreen();
            return Promise.resolve();
        } catch (err) {
            console.log('Phaser fullscreen failed, trying native API:', err);
        }
    }
    
    // Fallback to native fullscreen API
    // Try different elements in order of preference
    const canvas = document.querySelector('canvas');
    const body = document.body;
    const html = document.documentElement;
    
    // Try canvas first, then body, then html
    const elements = [canvas, body, html].filter(el => el !== null);
    
    for (const element of elements) {
        console.log('Attempting fullscreen on element:', element.tagName || element.nodeName);
        
        try {
            // Try different fullscreen APIs for cross-browser support
            if (element.requestFullscreen) {
                await element.requestFullscreen();
                return; // Success!
            } else if (element.webkitRequestFullscreen) { // Safari
                await element.webkitRequestFullscreen();
                return; // Success!
            } else if (element.webkitRequestFullScreen) { // Older Safari
                await element.webkitRequestFullScreen();
                return; // Success!
            } else if (element.mozRequestFullScreen) { // Firefox
                await element.mozRequestFullScreen();
                return; // Success!
            } else if (element.msRequestFullscreen) { // IE/Edge
                await element.msRequestFullscreen();
                return; // Success!
            }
        } catch (err) {
            console.error(`Fullscreen failed for ${element.tagName || element.nodeName}:`, err);
            // Continue to next element
        }
    }
    
    throw new Error('Fullscreen API not supported or all attempts failed');
}

// Function to lock orientation to landscape
function lockOrientation() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Try Screen Orientation API
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
                console.log('Orientation lock failed:', err);
            });
        }
        // Fallback for older browsers
        else if (screen.lockOrientation) {
            screen.lockOrientation('landscape');
        } else if (screen.mozLockOrientation) {
            screen.mozLockOrientation('landscape');
        } else if (screen.msLockOrientation) {
            screen.msLockOrientation('landscape');
        }
    }
}

startBtn.addEventListener("click", async (e) => {
    // Request fullscreen FIRST (must be direct user gesture)
    // Some browsers require fullscreen to be called directly from click handler
    try {
        await requestFullscreen();
        console.log('✅ Fullscreen enabled successfully');
        
        // Wait a bit for fullscreen to settle, then update background
        setTimeout(() => {
            if (window.gameInstance && window.gameInstance.scene && window.gameInstance.scene.scenes[0]) {
                const scene = window.gameInstance.scene.scenes[0];
                if (scene.updateBackgroundSize) {
                    scene.updateBackgroundSize();
                }
            }
        }, 100);
    } catch (error) {
        console.error('❌ Fullscreen request failed:', error);
        console.log('Fullscreen error details:', {
            message: error.message,
            name: error.name
        });
        // Game continues even if fullscreen fails
    }
    
    // Hide start panel and button
    startPanel.style.display = "none";
    startBtn.style.display = "none";
    
    // Hide orientation message
    const orientationMessage = document.getElementById("orientationMessage");
    if (orientationMessage) {
        orientationMessage.classList.remove('show');
    }
    
    // Lock orientation to landscape (mobile)
    lockOrientation();
    
    // Start the game (spawn fruits)
    if (window.startGame) {
        setTimeout(() => {
            window.startGame();
        }, 200); // Small delay to ensure fullscreen is applied
    } else {
        console.warn('⚠️ startGame function not found');
    }
});