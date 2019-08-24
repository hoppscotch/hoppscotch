export default (() => {
  //*** Determine whether or not the PWA has been installed. ***//

  // Step 1: Check local storage
  let pwaInstalled = localStorage.getItem('pwaInstalled') === 'yes';

  // Step 2: Check if the display-mode is standalone. (Only permitted for PWAs.)
  if (!pwaInstalled && window.matchMedia('(display-mode: standalone)').matches) {
    localStorage.setItem('pwaInstalled', 'yes');
    pwaInstalled = true;
  }

  // Step 3: Check if the navigator is in standalone mode. (Again, only permitted for PWAs.)
  if (!pwaInstalled && window.navigator.standalone === true) {
    localStorage.setItem('pwaInstalled', 'yes');
    pwaInstalled = true;
  }

  //*** If the PWA has not been installed, show the install PWA prompt.. ***//
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    deferredPrompt = event;

    // Show the install button if the prompt appeared.
    if (!pwaInstalled) {
      document.getElementById('installPWA').style.display = 'block';
    }
  });

  // When the app is installed, remove install prompts.
  window.addEventListener('appinstalled', (event) => {
    localStorage.setItem('pwaInstalled', 'yes');
    pwaInstalled = true;
    document.getElementById('installPWA').style.display = 'none';
  });

  return async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      let outcome = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('Postwoman was installed successfully.')
      } else {
        console.log('Postwoman could not be installed. (Installation rejected by user.)')
      }
      deferredPrompt = null;
    }
  };

});
