const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'models');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const modelDirs = [
  'tiny_face_detector',
  'face_landmark_68',
  'face_recognition',
];

const baseRepo = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master';

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
    console.log('Descargando modelos...');
    for (const dir of modelDirs) {
      const manifestName = `${dir}_model-weights_manifest.json`;
      const manifestUrl = `${baseRepo}/${dir}/${manifestName}`;
      const manifestDest = path.join(outDir, manifestName);
      console.log(' ->', manifestName);
      await download(manifestUrl, manifestDest);

      const manifest = JSON.parse(fs.readFileSync(manifestDest, 'utf8'));
      for (const g of manifest) {
        if (Array.isArray(g.paths)) {
          for (const shard of g.paths) {
            const shardUrl = `${baseRepo}/${dir}/${shard}`;
            const shardDest = path.join(outDir, shard);
            if (fs.existsSync(shardDest)) {
              console.log('   existe', shard);
              continue;
            }
            console.log('   ->', shard);
            await download(shardUrl, shardDest);
          }
        } else if (Array.isArray(g.weights)) {
          for (const f of g.weights) {
            const shard = f.path || f.filename || f.name;
            if (!shard) continue;
            const shardUrl = `${baseRepo}/${dir}/${shard}`;
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
    }

    console.log('\nDescarga completada. Archivos en:', outDir);
    const files = fs.readdirSync(outDir);
    console.log(files.join('\n'));
  } catch (err) {
    console.error('Error descargando modelos:', err.message);
    process.exit(1);
  }
})();
