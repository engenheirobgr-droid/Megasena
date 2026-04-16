export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const swPath = `${import.meta.env.BASE_URL}sw.js`;
      await navigator.serviceWorker.register(swPath);
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  });
}
