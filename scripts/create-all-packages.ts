import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function addDirectoryToZip(zip: JSZip, localDir: string, zipPrefix: string = '', isGmailSafe = false) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    // Skip node_modules, .git, and output zip archives
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.endsWith('.zip') || entry.name.endsWith('.zip.txt')) {
      continue;
    }

    const fullPath = path.join(localDir, entry.name);
    let zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, zipPath, isGmailSafe);
    } else if (entry.isFile()) {
      const buffer = fs.readFileSync(fullPath);

      // In Gmail-safe mode, rename .bat and .command to .bat.txt and .command.txt
      if (isGmailSafe && (entry.name.endsWith('.bat') || entry.name.endsWith('.command') || entry.name.endsWith('.sh'))) {
        zipPath = `${zipPath}.txt`;
      }

      zip.file(zipPath, buffer);
    }
  }
}

async function main() {
  console.log('Generating comprehensive distribution packages...');
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. FULL PACKAGE (Standard)
  console.log('[1/3] Packaging Full Complete Distribution (Source + Dist + Portable Server + Electron)...');
  const fullZip = new JSZip();
  await addDirectoryToZip(fullZip, rootDir, '', false);

  const fullZipBuffer = await fullZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const fullPkgPath1 = path.join(publicDir, 'Saif-Karyana-Store-POS-Full-Package.zip');
  const fullPkgPath2 = path.join(publicDir, 'BusinessDesk-Grocery-v1.0.0-Full-Package.zip');
  const fullPkgPathTxt = path.join(publicDir, 'BusinessDesk-Grocery-v1.0.0-Full-Package.zip.txt');

  fs.writeFileSync(fullPkgPath1, fullZipBuffer);
  fs.writeFileSync(fullPkgPath2, fullZipBuffer);
  fs.writeFileSync(fullPkgPathTxt, fullZipBuffer);
  console.log(`Saved: ${fullPkgPath1} (${(fullZipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // 2. GMAIL-SAFE PACKAGE
  console.log('[2/3] Packaging Gmail-Safe Distribution...');
  const gmailZip = new JSZip();
  await addDirectoryToZip(gmailZip, rootDir, '', true);

  const gmailZipBuffer = await gmailZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const gmailPkgPath = path.join(publicDir, 'BusinessDesk-Grocery-v1.0.0-Gmail-Safe.zip');
  fs.writeFileSync(gmailPkgPath, gmailZipBuffer);
  console.log(`Saved: ${gmailPkgPath} (${(gmailZipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // Also copy to dist if dist exists
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.copyFileSync(fullPkgPath1, path.join(distDir, 'Saif-Karyana-Store-POS-Full-Package.zip'));
    fs.copyFileSync(fullPkgPath2, path.join(distDir, 'BusinessDesk-Grocery-v1.0.0-Full-Package.zip'));
    fs.copyFileSync(fullPkgPathTxt, path.join(distDir, 'BusinessDesk-Grocery-v1.0.0-Full-Package.zip.txt'));
    fs.copyFileSync(gmailPkgPath, path.join(distDir, 'BusinessDesk-Grocery-v1.0.0-Gmail-Safe.zip'));
  }

  console.log('All packages generated successfully!');
}

main().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
