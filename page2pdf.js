const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const htmlPath = 'file://' + path.resolve('_site/assets/index.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle2' });
  await page.pdf({
    path: '_site/me.pdf',
    format: 'A4',
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    printBackground: true
  });
  await browser.close();
  console.log('PDF written to _site/me.pdf');
})();
