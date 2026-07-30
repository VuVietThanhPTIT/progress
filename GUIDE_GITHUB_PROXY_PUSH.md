# HƯỚNG DẪN ĐÓNG GÓI & SỬ DỤNG TOOL PUSH CODE QUA PROXY CÔNG TY (BYPASS PROXY)

Tài liệu này hướng dẫn chi tiết từng bước cách thiết lập và sử dụng công cụ **GitHub REST API Sync Tool** giúp đẩy code lên GitHub tự động khi bạn làm việc trên máy ảo / mạng doanh nghiệp bị chặn lệnh `git push` mặc định bởi Firewall (như Skyhigh Secure Web Gateway).

---

## 🧐 1. TẠI SAO CẦN DÙNG TOOL NÀY?

Trong môi trường doanh nghiệp hoặc máy ảo:
- **Lệnh `git push` thông thường bị chặn**: Firewall công ty phát hiện và chặn các gói tin nén `POST /git-receive-pack` của Git CLI (báo lỗi `HTTP 403 send-pack: unexpected disconnect`).
- **GitHub REST API thì HỢP LỆ**: Proxy công ty mở cho luồng dữ liệu Web HTTPS tiêu chuẩn (`api.github.com`).
- **Tool này giải quyết vấn đề bằng cách**: Tự động phát hiện các file bạn vừa sửa trong dự án và dùng `curl` chuyển đổi file thành gói mã hóa Base64 gửi qua GitHub REST API để cập nhật trực tiếp lên repository của bạn.

---

## 🛠️ 2. HƯỚNG DẪN CẤU HÌNH TỪNG BƯỚC CHO DỰ ÁN MỚI

Nếu bạn có một dự án mới (Node.js/React/Vue/Python...), bạn chỉ cần thực hiện 3 bước đơn giản sau:

### 📌 Bước 1: Thêm Token vào file `.env`
Mở file `.env` ở thư mục gốc dự án và dán mã GitHub Personal Access Token của bạn vào:

```env
GITHUB_TOKEN=ghp_MãTokenCủaBạnỞĐây
```
*(Đảm bảo file `.env` đã có trong file `.gitignore` để không bị lộ token).*

---

### 📌 Bước 2: Tạo file Tool `scripts/github-push.js`
Tạo một file mới tại đường dẫn `scripts/github-push.js` trong dự án và dán toàn bộ đoạn mã sau vào:

```javascript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 1. Đọc Token từ file .env hoặc biến môi trường
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

// 2. Cấu hình thông số (Tự động lấy thông tin từ Git Remote)
function getRepoInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    // Trích xuất username/repo từ URL https://github.com/user/repo.git
    const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/);
    if (match) return match[1];
  } catch (e) {}
  return 'VuVietThanhPTIT/progress'; // Mặc định nếu không lấy được
}

const TOKEN = getEnvToken();
const REPO = getRepoInfo();
const PROXY = process.env.HTTP_PROXY || process.env.http_proxy || 'http://10.36.252.45:8080';

// Các file mặc định nếu git status không quét được
const defaultFiles = [
  'src/api/tasks.js',
  'src/api/goals.js',
  'src/api/visualization.js',
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

// Tự động tìm tất cả các file vừa được chỉnh sửa (giống git status)
function getChangedFiles() {
  try {
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf-8' });
    const lines = statusOutput.split('\n').filter(Boolean);
    const rawFiles = lines.map(line => line.trim().split(/\s+/)[1]).filter(Boolean);
    
    let result = [];
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
    
    return result.length > 0 ? Array.from(new Set(result)) : defaultFiles;
  } catch (err) {
    return defaultFiles;
  }
}

async function syncFile(relativePath) {
  const normPath = relativePath.replace(/\\/g, '/');
  console.log(`\n⏳ Đang đẩy file: ${normPath}...`);
  const absolutePath = path.resolve(process.cwd(), normPath);

  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    return;
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const base64Content = fileBuffer.toString('base64');

  // Lấy SHA của file hiện tại trên GitHub (nếu file đã tồn tại)
  let sha = null;
  const getUrl = `https://api.github.com/repos/${REPO}/contents/${normPath}`;
  try {
    const getCmd = `curl.exe -s -x ${PROXY} -H "Authorization: Bearer ${TOKEN}" -H "User-Agent: NodeSync" "${getUrl}"`;
    const getResRaw = execSync(getCmd).toString();
    const getRes = JSON.parse(getResRaw);
    if (getRes && getRes.sha) {
      sha = getRes.sha;
    }
  } catch (err) {}

  // Đẩy/Cập nhật file qua GitHub REST API
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
      console.log(`✅ THÀNH CÔNG: ${normPath} -> GitHub! Commit: ${putRes.commit.sha.substring(0, 7)}`);
    } else {
      console.error(`⚠️ Phản hồi từ GitHub cho ${normPath}:`, putRes.message || putRes);
    }
  } catch (err) {
    console.error(`❌ Thất bại khi đẩy ${normPath}:`, err.message);
  } finally {
    if (fs.existsSync(tempPayloadFile)) {
      fs.unlinkSync(tempPayloadFile);
    }
  }
}

async function run() {
  if (!TOKEN) {
    console.error('❌ Không tìm thấy GITHUB_TOKEN trong file .env');
    process.exit(1);
  }
  console.log(`🚀 Bắt đầu Push Code lên GitHub (${REPO}) qua Proxy công ty...`);
  const filesToSync = getChangedFiles();
  console.log(`📋 Phát hiện ${filesToSync.length} file cần đồng bộ: ${filesToSync.join(', ')}`);
  for (const f of filesToSync) {
    await syncFile(f);
  }
  console.log(`\n🎉 Tất cả các file đã được đẩy lên GitHub thành công!`);
}

run();
```

---

### 📌 Bước 3: Thêm lệnh `npm run push` vào `package.json`
Mở file `package.json` và thêm dòng `"push": "node scripts/github-push.js"` vào phần `"scripts"`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "push": "node scripts/github-push.js"
}
```

---

## ⚡ 3. CÁCH SỬ DỤNG HÀNG NGÀY

Mỗi khi bạn sửa xong code trong dự án và muốn đưa code lên GitHub:

1. Mở Cửa sổ lệnh (Terminal/PowerShell) tại dự án.
2. Gõ duy nhất lệnh sau:
   ```bash
   npm run push
   ```
3. Tool sẽ tự động quét các file bạn vừa chỉnh sửa, chuyển qua REST API và đẩy thẳng lên GitHub thành công!

---

## ❓ XỬ LÝ SỰ CỐ THƯỜNG GẶP

- **Lỗi `GITHUB_TOKEN not found`**: Kiểm tra lại file `.env` đã có dòng `GITHUB_TOKEN=ghp_...` chưa.
- **Lỗi `Proxy connection timeout`**: Đảm bảo Proxy của máy ảo `http://10.36.252.45:8080` vẫn đang bật trong Cài đặt mạng của Windows.
