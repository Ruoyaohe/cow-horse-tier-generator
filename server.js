import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;
const distPath = path.join(__dirname, 'dist');
const tucaoDir = path.join(__dirname, 'public', 'tucao');

if (!fs.existsSync(tucaoDir)) {
  fs.mkdirSync(tucaoDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, content, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(content);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('请求体过大'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function safeFeedbackPath(filename) {
  const safeName = path.basename(filename);
  if (!safeName.endsWith('.txt')) {
    return null;
  }
  return path.join(tucaoDir, safeName);
}

function serveStaticFile(reqUrl, res) {
  if (!fs.existsSync(distPath)) {
    sendJson(res, 503, {
      success: false,
      message: '前端文件尚未构建',
    });
    return;
  }

  const decodedPath = decodeURIComponent(reqUrl.pathname);
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.normalize(path.join(distPath, requestedPath));

  if (!filePath.startsWith(distPath)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  const targetPath = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : path.join(distPath, 'index.html');

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.createReadStream(targetPath)
    .on('error', () => sendText(res, 500, 'File read failed'))
    .pipe(res.writeHead(200, { 'Content-Type': contentType }));
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/health') {
      sendJson(res, 200, {
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/feedback') {
      const rawBody = await readRequestBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const { timestamp, tier, score, profile = {}, feedback } = body;

      if (!feedback || !feedback.trim()) {
        sendJson(res, 400, {
          success: false,
          message: '吐槽内容不能为空',
        });
        return;
      }

      const textContent = `【牛马吐槽 - ${timestamp}】
等级：${tier} (得分: ${score})
工作数据：
  - 日均工时：${profile.dailyHours}H
  - 月休天数：${profile.leaveDays}D
  - 连续工作：${profile.continuousDays}D
  - 伙食标准：${profile.mealAllowance}￥
  - 月薪区间：${profile.salaryRange}

吐槽内容：
${feedback}

${'='.repeat(50)}

`;

      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `tucao-${dateStr}-${timeStr}.txt`;
      const filepath = path.join(tucaoDir, filename);

      fs.writeFileSync(filepath, textContent, 'utf-8');

      sendJson(res, 200, {
        success: true,
        message: '吐槽已保存',
        filename,
      });
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/feedback/list') {
      const files = fs.readdirSync(tucaoDir)
        .filter(file => file.endsWith('.txt'))
        .map(file => {
          const filepath = path.join(tucaoDir, file);
          const stats = fs.statSync(filepath);
          return {
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          };
        })
        .sort((a, b) => b.created - a.created);

      sendJson(res, 200, {
        success: true,
        files,
      });
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname.startsWith('/api/feedback/')) {
      const filename = reqUrl.pathname.replace('/api/feedback/', '');
      const filepath = safeFeedbackPath(filename);

      if (!filepath || !fs.existsSync(filepath)) {
        sendJson(res, 404, {
          success: false,
          message: '文件不存在',
        });
        return;
      }

      sendJson(res, 200, {
        success: true,
        content: fs.readFileSync(filepath, 'utf-8'),
      });
      return;
    }

    if (reqUrl.pathname.startsWith('/api/')) {
      sendJson(res, 404, {
        success: false,
        message: '接口不存在',
      });
      return;
    }

    serveStaticFile(reqUrl, res);
  } catch (error) {
    console.error('请求处理失败:', error);
    sendJson(res, 500, {
      success: false,
      message: `服务器错误：${error.message}`,
    });
  }
});

server.on('error', error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
