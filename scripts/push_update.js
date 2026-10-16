const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const { execSync } = require('child_process');

async function syncAndPush() {
  const dir = '.';
  console.log('[1/4] Scanning repository for changed and untracked files...');
  const matrix = await git.statusMatrix({ fs, dir });
  const changed = matrix.filter(r => r[1] !== 1 || r[2] !== 1 || r[3] !== 1);

  console.log(`Found ${changed.length} file(s) with modifications:`);
  for (const [filepath, head, workdir, stage] of changed) {
    console.log(` - ${filepath} (head:${head}, workdir:${workdir}, stage:${stage})`);
    if (workdir === 2) {
      await git.add({ fs, dir, filepath });
    } else if (workdir === 0 && head === 1) {
      await git.remove({ fs, dir, filepath });
    }
  }

  if (changed.length === 0) {
    console.log('Working tree is clean. Checking if unpushed commits exist...');
  } else {
    console.log('[2/4] Committing changes...');
    const commitMsg = 'feat: synchronize backend and frontend (room discovery, friends & profiles, audit checks, and results breakdown)';
    const sha = await git.commit({
      fs,
      dir,
      message: commitMsg,
      author: {
        name: 'Hank Studio',
        email: 'hankstudio@gmail.com'
      }
    });
    console.log(`[PASS] Created commit ${sha}`);
  }

  console.log('[3/4] Authenticating with GitHub via gh CLI...');
  let token = '';
  try {
    token = execSync('gh auth token').toString().trim();
  } catch (err) {
    console.error('Warning: could not retrieve gh auth token:', err.message);
  }

  console.log('[4/4] Pushing changes to GitHub origin main...');
  const pushRes = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    onAuth: () => ({ username: token, password: '' })
  });

  console.log('[SUCCESS] Push completed:', JSON.stringify(pushRes, null, 2));
}

syncAndPush().catch(err => {
  console.error('[ERROR] Failed during sync and push:', err);
  process.exit(1);
});
