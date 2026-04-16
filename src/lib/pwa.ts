export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const swPath = `${import.meta.env.BASE_URL}sw.js`;
      const registration = await navigator.serviceWorker.register(swPath);
      await registration.update();
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  });
}
