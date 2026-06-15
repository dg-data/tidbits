var https = require('https'),
    fs = require('fs'),
    lang = process.argv[2];

function download(url, dest) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, response => {
        if (response.statusCode === 200) {
          const file = fs.createWriteStream(dest, { flags: 'w' });
          file.on('finish', () => resolve());
          file.on('error', err => {
            file.close();
            if (err.code === 'EEXIST') reject('File already exists');
            else fs.unlink(dest, () => reject(err.message));
          });
          response.pipe(file);
        }
        else if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location, dest).then(() => resolve());
        }
        else {
          reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
        }
      });
  
      request.on('error', err => {
        reject(err.message);
      });
    });
}
var url = 'https://my.microsoftpersonalcontent.com/personal/b4e529b179b5976d/_layouts/15/download.aspx?share=' +
    (lang === 'hu' ? 'IQQKO54HqiNURaA0mqDd91lZAd5o-JhwFzbp23zH7pDs0_4' : 'F1A01879C77A02B3&resid=F1A01879C77A02B3%21107&authkey=APIgto_m31k5He0')
download(url, './_data/me.yml')
    .catch(err => { console.error('Downloading content from drive failed:', err); process.exit(1); });
