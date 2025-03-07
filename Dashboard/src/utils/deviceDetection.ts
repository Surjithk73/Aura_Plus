export const isMobileDevice = (): boolean => {
  // For testing purposes, always return true
  return true;

  // Original mobile detection code
  /*
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Regular expressions for mobile devices
  const mobileRegex = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i
  ];

  return mobileRegex.some((regex) => userAgent.match(regex));
  */
};

// Check if WebXR is supported
export const isVRSupported = async (): Promise<boolean> => {
  // For testing purposes, always return true
  return true;

  // Original VR support detection code
  /*
  if (!navigator.xr) {
    return false;
  }

  try {
    return await navigator.xr.isSessionSupported('immersive-vr');
  } catch (error) {
    console.error('Error checking VR support:', error);
    return false;
  }
  */
}; 