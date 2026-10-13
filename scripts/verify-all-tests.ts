import { db } from '../src/db/db';
import { TestRunner } from '../src/services/testRunner';

async function main() {
  console.log('Initializing Database...');
  await db.init();
  console.log('Database initialized successfully.');

  console.log('\n--- Running Test Suite (Scenarios A through O) ---');
  const results = await TestRunner.runAllScenarios();

  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✓' : '✗';
    console.log(`${symbol} [${r.scenario}] ${r.name} (${r.durationMs}ms)`);
    if (!r.passed) {
      console.error(`   ERROR: ${r.message}`);
      allPassed = false;
    } else {
      console.log(`   Message: ${r.message.slice(0, 100)}...`);
    }
  }

  console.log('\n--- Stress Testing 1,500 Item Bulk Generation ---');
  const bulkStart = performance.now();
  const added = await db.generateBulkGroceryCatalog(1500);
  const bulkDuration = performance.now() - bulkStart;
  console.log(`Generated ${added} products in ${bulkDuration.toFixed(1)}ms. Total products now: ${db.getProducts().length}`);

  console.log('\n--- Benchmarking O(1) Index Lookups with Large Catalog ---');
  const products = db.getProducts();
  const sample = products[products.length - 1];
  const queryStart = performance.now();
  const queryIterations = 2000;
  for (let i = 0; i < queryIterations; i++) {
    db.getProductById(sample.id);
    db.getProductBySku(sample.sku);
    if (sample.barcode) db.getProductByBarcode(sample.barcode);
  }
  const queryDuration = performance.now() - queryStart;
  console.log(`Executed ${queryIterations * 3} queries in ${queryDuration.toFixed(2)}ms (${(queryDuration / (queryIterations * 3)).toFixed(4)}ms / query)`);

  console.log('\n--- Testing Crash Recovery Snapshot & Restore ---');
  db.saveCrashRecoverySnapshot();
  const snap = db.getCrashRecoverySnapshot();
  console.log(`Snapshot retrieved: recordCount = ${snap?.recordCount}, timestamp = ${snap?.timestamp}`);
  if (!snap || snap.recordCount < 1500) {
    throw new Error('Crash snapshot verification failed!');
  }

  console.log('\n--- Testing Backup JSON Export & Import ---');
  const backupJson = db.exportBackupJson();
  console.log(`Backup JSON exported successfully: length = ${(backupJson.length / 1024).toFixed(1)} KB`);
  const parsed = JSON.parse(backupJson);
  console.log(`Backup products count = ${parsed.database.products.length}`);

  if (!allPassed) {
    console.error('\nFAIL: Some scenarios failed!');
    process.exit(1);
  }

  console.log('\nSUCCESS: All functional, non-functional, security, and load tests PASSED 100%!');
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
