#!/usr/bin/env node

/**
 * Switch Cron Job Models
 * Safely adds/updates the "model" field for specific cron jobs
 */

const fs = require('fs');
const path = require('path');

const JOBS_FILE = path.join(process.env.HOME, '.clawdbot/cron/jobs.json');
const BACKUP_FILE = JOBS_FILE + '.model-switch-backup';

// Jobs to switch to Haiku (by job name)
const HAIKU_JOBS = [
  'Morning Brief',
  'Clawdbot Backup',
  'NFT Price Monitor',
  'Session Pruning',
  'Claude Quota Monitor'
];

function main() {
  // Check if jobs file exists
  if (!fs.existsSync(JOBS_FILE)) {
    console.error(`❌ Jobs file not found: ${JOBS_FILE}`);
    process.exit(1);
  }

  // Read current jobs
  console.log('📖 Reading jobs.json...');
  const jobsData = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));

  // Create backup
  console.log('💾 Creating backup...');
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(jobsData, null, 2));
  console.log(`   Backup saved to: ${BACKUP_FILE}`);

  // Track changes
  let changesCount = 0;
  const changes = [];

  // Update jobs
  console.log('\n🔄 Analyzing jobs...');
  jobsData.jobs.forEach(job => {
    if (HAIKU_JOBS.includes(job.name)) {
      const oldModel = job.model || '(default/sonnet)';
      job.model = 'haiku';
      
      if (oldModel !== 'haiku') {
        changesCount++;
        changes.push({
          name: job.name,
          oldModel,
          newModel: 'haiku'
        });
        console.log(`   ✅ ${job.name}: ${oldModel} → haiku`);
      } else {
        console.log(`   ⏭️  ${job.name}: already haiku`);
      }
    } else {
      console.log(`   ⏭️  ${job.name}: keeping current model (${job.model || 'default'})`);
    }
  });

  // Show summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total jobs: ${jobsData.jobs.length}`);
  console.log(`   Changed: ${changesCount}`);

  // If dry run, show changes and exit
  if (process.argv.includes('--dry-run')) {
    console.log('\n🔍 DRY RUN - No changes applied');
    if (changesCount > 0) {
      console.log('\nChanges that would be made:');
      changes.forEach(c => {
        console.log(`   • ${c.name}: ${c.oldModel} → ${c.newModel}`);
      });
    }
    process.exit(0);
  }

  // Apply changes
  if (changesCount > 0) {
    console.log('\n💾 Writing updated jobs.json...');
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobsData, null, 2));
    console.log('   ✅ Changes saved!');
    
    console.log('\n🔄 Next steps:');
    console.log('   1. Restart Clawdbot gateway: clawdbot gateway restart');
    console.log('   2. Verify with: clawdbot cron list');
    console.log(`   3. If issues, restore backup: cp ${BACKUP_FILE} ${JOBS_FILE}`);
  } else {
    console.log('\n✅ No changes needed - all jobs already configured correctly');
  }
}

// Run it
try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
