import { MainScene } from "./scenes/MainScene.js";
import { SliceTestScene } from "./scripts/SliceTestScene.js";

// Detect if mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Get actual screen dimensions
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

// Calculate responsive gravity based on screen height
// Base gravity for 1080p, scales with screen height
const baseHeight = 1080;
const baseGravity = 300;
const gravityScale = screenHeight / baseHeight;
const responsiveGravity = baseGravity * gravityScale;

const config = {
    type: Phaser.AUTO,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#222',
    // High DPR support for crisp graphics on retina/high DPR screens
    resolution: window.devicePixelRatio || 1,
    antialias: true, // Enable antialiasing for smoother edges
    pixelArt: false, // Set to false to allow smooth scaling (not pixel art style)
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: responsiveGravity },
            debug: false
        }
    },
    plugins: {
        global: [
            {
                key: 'RawgesturePlugin',
                plugin: Phaser.Plugins.RawgesturePlugin,
                start: true
            }
        ]
    },
    scene: MainScene,
    scale: {
        // mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: '100%',
        height: '100%'
    },
    render: {
        // Enable high DPR rendering
        antialias: true,
        pixelArt: false,
        roundPixels: false, // Allow sub-pixel rendering for smoother movement
        powerPreference: "high-performance" // Use high-performance GPU if available
    }
};

const game = new Phaser.Game(config);

// Make game instance globally accessible for fullscreen
window.gameInstance = game;

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.refresh();
});

// Lock orientation on mobile
if (isMobile) {
    // Try to lock orientation (may not work on all browsers)
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
            console.log('Orientation lock failed:', err);
        });
    }
}
