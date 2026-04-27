const { join } = require('path');

module.exports = {
  // Zmień lokalizację cache na katalog projektu (Render to zaakceptuje)
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  
  // Upewnij się, że Chrome jest pobierany
  chrome: {
    skipDownload: false
  }
};
