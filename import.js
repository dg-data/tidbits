function download(url, dest) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, response => {
        if (response.statusCode === 200) {
          const file = fs.createWriteStream(dest, { flags: 'wx' });
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
download("https://onedrive.live.com/download?cid=F1A01879C77A02B3&resid=F1A01879C77A02B3%21107&authkey=APIgto_m31k5He0","./_data/test.yml")
