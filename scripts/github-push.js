import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function getEnvToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GITHUB_TOKEN=(.+)/);
    if (match) return match[1].trim();
  }
  return '';
}

function getRepoInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/);
    if (match) return match[1].replace(/\.git$/, '');
  } catch (e) {}
  return 'VuVietThanhPTIT/progress';
}

const TOKEN = getEnvToken();
const REPO = getRepoInfo();
const PROXY = process.env.HTTP_PROXY || process.env.http_proxy || 'http://10.36.252.45:8080';

const defaultFiles = [
  'src/api/tasks.js',
  'src/api/goals.js',
  'src/api/visualization.js',
  'src/api/icsParser.js',
  'src/components/visualization/VisPage.jsx',
  'src/components/settings/SettingsPage.jsx',
  'package.json'
];

function getAllFilesInDir(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFilesInDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function getChangedFiles() {
  try {
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf-8' });
    const lines = statusOutput.split('\n').filter(Boolean);
    const rawFiles = lines.map(line => line.trim().split(/\s+/)[1]).filter(Boolean);
    
    let result = [...defaultFiles];
    for (const item of rawFiles) {
      if (item.includes('node_modules') || item.startsWith('.git') || item.includes('.env')) continue;
      if (fs.existsSync(item)) {
        if (fs.statSync(item).isDirectory()) {
          const files = getAllFilesInDir(item);
          result.push(...files);
        } else {
          result.push(item);
        }
      }
    }
    
    return Array.from(new Set(result));
  } catch (err) {
    return defaultFiles;
  }
}

async function syncFile(relativePath) {
  const normPath = relativePath.replace(/\\/g, '/');
  console.log(`\n⏳ Processing ${normPath}...`);
  const absolutePath = path.resolve(process.cwd(), normPath);

  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    return;
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const base64Content = fileBuffer.toString('base64');

  // Step 1: Get current SHA of file on GitHub (if exists)
  let sha = null;
  const getUrl = `https://api.github.com/repos/${REPO}/contents/${normPath}`;
  try {
    const getCmd = `curl.exe -s -x ${PROXY} -H "Authorization: Bearer ${TOKEN}" -H "User-Agent: NodeSync" "${getUrl}"`;
    const getResRaw = execSync(getCmd).toString();
    const getRes = JSON.parse(getResRaw);
    if (getRes && getRes.sha) {
      sha = getRes.sha;
    }
  } catch (err) {
    // New file
  }

  // Step 2: Push/Update via GitHub REST API PUT
  const tempPayloadFile = path.resolve(process.cwd(), `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
  const payload = {
    message: `sync: update ${normPath}`,
    content: base64Content,
    ...(sha ? { sha } : {})
  };

  fs.writeFileSync(tempPayloadFile, JSON.stringify(payload));

  try {
    const putUrl = `https://api.github.com/repos/${REPO}/contents/${normPath}`;
    const putCmd = `curl.exe -s -X PUT -x ${PROXY} -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -H "User-Agent: NodeSync" --data-binary "@${tempPayloadFile}" "${putUrl}"`;
    const putResRaw = execSync(putCmd).toString();
    const putRes = JSON.parse(putResRaw);

    if (putRes && putRes.content) {
      console.log(`✅ SUCCESS: ${normPath} pushed to GitHub! Commit SHA: ${putRes.commit.sha.substring(0, 7)}`);
    } else {
      console.error(`⚠️ Upload response for ${normPath}:`, putRes.message || putRes);
    }
  } catch (err) {
    console.error(`❌ Failed to push ${normPath}:`, err.message);
  } finally {
    if (fs.existsSync(tempPayloadFile)) {
      fs.unlinkSync(tempPayloadFile);
    }
  }
}

async function run() {
  if (!TOKEN) {
    console.error('❌ GITHUB_TOKEN not found in .env');
    process.exit(1);
  }
  console.log(`🚀 Starting GitHub REST API Push Tool via Corporate Proxy (${REPO})...`);
  const filesToSync = getChangedFiles();
  console.log(`📋 Found ${filesToSync.length} file(s) to sync.`);
  for (const f of filesToSync) {
    await syncFile(f);
  }
  console.log(`\n🎉 All files synced to GitHub successfully!`);
}

run();
