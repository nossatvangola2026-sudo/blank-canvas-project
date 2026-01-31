// Device fingerprinting utility for fraud prevention
// Creates a unique identifier based on browser/device characteristics

interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

// Generate a hash from string
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get canvas fingerprint
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    canvas.width = 200;
    canvas.height = 50;
    
    // Draw text with specific styling
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Device fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device fingerprint', 4, 17);
    
    return canvas.toDataURL();
  } catch {
    return 'canvas-blocked';
  }
}

// Get WebGL fingerprint
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return `${vendor}~${renderer}`;
    }
    return 'webgl-no-debug';
  } catch {
    return 'webgl-blocked';
  }
}

// Get audio fingerprint
function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) {
        resolve('no-audio');
        return;
      }
      
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
      
      gainNode.gain.value = 0;
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(0);
      
      const dataArray = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(dataArray);
      
      oscillator.stop();
      context.close();
      
      const hash = dataArray.slice(0, 30).reduce((acc, val) => acc + Math.abs(val), 0);
      resolve(hash.toString());
    } catch {
      resolve('audio-blocked');
    }
  });
}

// Get installed plugins
function getPlugins(): string {
  try {
    const plugins = Array.from(navigator.plugins || []);
    return plugins.map(p => `${p.name}:${p.filename}`).join(',');
  } catch {
    return 'plugins-blocked';
  }
}

// Get touch support info
function getTouchSupport(): string {
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const touchEvent = 'ontouchstart' in window;
  return `${maxTouchPoints}:${touchEvent}`;
}

// Get hardware concurrency
function getHardwareConcurrency(): string {
  return navigator.hardwareConcurrency?.toString() || 'unknown';
}

// Get device memory (if available)
function getDeviceMemory(): string {
  return ((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown').toString();
}

// Main function to generate device fingerprint
export async function generateDeviceFingerprint(): Promise<DeviceInfo> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getPlugins(),
    getTouchSupport(),
    getHardwareConcurrency(),
    getDeviceMemory(),
    navigator.platform,
  ];
  
  const audioFP = await getAudioFingerprint();
  components.push(audioFP);
  
  const combinedString = components.join('|||');
  const fingerprint = await hashString(combinedString);
  
  return {
    fingerprint,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

// Store fingerprint in localStorage for consistency
export function getStoredFingerprint(): string | null {
  return localStorage.getItem('device_fp');
}

export function storeFingerprint(fingerprint: string): void {
  localStorage.setItem('device_fp', fingerprint);
}
