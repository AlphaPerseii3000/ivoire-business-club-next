/**
 * Diagnostic script: checks SEO-critical files for the IBC project.
 * Run with: node scripts/diagnose-seo.mjs
 */
import fs from 'fs';

function checkFile(fullPath) {
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`\n=== ${fullPath} (${content.length} chars) ===`);
    const lines = content.split('\n');
    lines.slice(0, 100).forEach((line, i) => console.log(`${i + 1}: ${line}`));
  } catch (e) {
    console.log(`\n=== ${fullPath} === FILE NOT FOUND`);
  }
}

// robots.ts
console.log("--- robots.ts ---");
checkFile('/home/alphaperseii/projects/ibc/src/app/robots.ts');

// sitemap.ts
console.log("\n--- sitemap.ts ---");
checkFile('/home/alphaperseii/projects/ibc/src/app/sitemap.ts');

// site-config.ts
console.log("\n--- site-config.ts ---");
checkFile('/home/alphaperseii/projects/ibc/src/lib/site-config.ts');

// middleware.ts
console.log("\n--- middleware.ts ---");
checkFile('/home/alphaperseii/projects/ibc/src/middleware.ts');

// next.config (try all variants)
console.log("\n--- next.config ---");
checkFile('/home/alphaperseii/projects/ibc/next.config.mjs');
checkFile('/home/alphaperseii/projects/ibc/next.config.js');
checkFile('/home/alphaperseii/projects/ibc/next.config.ts');

// package.json
console.log("\n--- package.json ---");
checkFile('/home/alphaperseii/projects/ibc/package.json');

// .env / .env.local
console.log("\n--- env files ---");
checkFile('/home/alphaperseii/projects/ibc/.env.local');
checkFile('/home/alphaperseii/projects/ibc/.env');

// vercel.json
checkFile('/home/alphaperseii/projects/ibc/vercel.json');
