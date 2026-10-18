const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'frontend', 'dist');
const distAssetsDir = path.join(distDir, 'assets');
const rootAssetsDir = path.join(rootDir, 'assets');
const publicAssetsDir = path.join(rootDir, 'public', 'assets');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(distDir)) {
  console.error('[sync-dist] frontend/dist directory does not exist! Run frontend build first.');
  process.exit(1);
}

// Ensure target directories exist
[rootAssetsDir, publicAssetsDir, publicDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. Copy index.html to root and public
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, path.join(rootDir, 'index.html'));
  fs.copyFileSync(distIndex, path.join(publicDir, 'index.html'));
  console.log('[sync-dist] Synced index.html -> root and public/');
}

// 2. Ensure 404.html exists in root and public
const root404 = path.join(rootDir, '404.html');
const dist404 = path.join(distDir, '404.html');
const public404 = path.join(publicDir, '404.html');
if (fs.existsSync(root404)) {
  fs.copyFileSync(root404, dist404);
  fs.copyFileSync(root404, public404);
  console.log('[sync-dist] Synced 404.html -> frontend/dist and public/');
}

// 3. Copy all assets from frontend/dist/assets to root/assets and public/assets
if (fs.existsSync(distAssetsDir)) {
  const assetFiles = fs.readdirSync(distAssetsDir);
  assetFiles.forEach(file => {
    const src = path.join(distAssetsDir, file);
    fs.copyFileSync(src, path.join(rootAssetsDir, file));
    fs.copyFileSync(src, path.join(publicAssetsDir, file));
    console.log(`[sync-dist] Copied asset: ${file} -> root/assets/ & public/assets/`);
  });
}

// 4. Copy logo and favicon files from frontend/dist to root and public
['logo.png', 'logo-transparent.png', 'favicon.png'].forEach(file => {
  const src = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(rootDir, file));
    fs.copyFileSync(src, path.join(publicDir, file));
    console.log(`[sync-dist] Synced ${file} -> root and public/`);
  }
});

// 4. Ensure .nojekyll in dist, root, and public
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '');
if (fs.existsSync(publicDir)) {
  fs.writeFileSync(path.join(publicDir, '.nojekyll'), '');
}
console.log('[sync-dist] Verified .nojekyll markers.');
console.log('[sync-dist] Distribution sync complete successfully!');
