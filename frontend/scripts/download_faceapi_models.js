const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'models');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const base = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights';
const manifests = [
  'tiny_face_detector_model-weights_manifest.json',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 400) return reject(new Error('Failed to download ' + url + ' Status ' + res.statusCode));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

(async () => {
  try {
    console.log('Descargando manifests...');
    for (const m of manifests) {
      const url = `${base}/${m}`;
      const dest = path.join(outDir, m);
      console.log(' ->', m);
      await download(url, dest);

      // parse manifest to download shard files
      const manifest = JSON.parse(fs.readFileSync(dest, 'utf8'));
      for (const g of manifest) {
        for (const f of g.weights) {
          const shard = f.path;
          const shardUrl = `${base}/${shard}`;
          const shardDest = path.join(outDir, shard);
          if (fs.existsSync(shardDest)) {
            console.log('   existe', shard);
            continue;
          }
          console.log('   ->', shard);
          await download(shardUrl, shardDest);
        }
      }
    }

    console.log('\nDescarga completada. Archivos en:', outDir);
    const files = fs.readdirSync(outDir);
    console.log(files.join('\n'));
  } catch (err) {
    console.error('Error descargando modelos:', err.message);
    process.exit(1);
  }
})();
