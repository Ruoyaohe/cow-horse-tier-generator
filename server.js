
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const distPath = path.join(__dirname, 'dist');

// 启用CORS
app.use(cors());
app.use(express.json());

// 确保tucao目录存在
const tucaoDir = path.join(__dirname, 'public', 'tucao');
if (!fs.existsSync(tucaoDir)) {
  fs.mkdirSync(tucaoDir, { recursive: true });
}

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// 保存吐槽的API
app.post('/api/feedback', (req, res) => {
  try {
    // 验证请求体
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: '请求体为空'
      });
    }

    const { timestamp, tier, score, profile, feedback } = req.body;

    // 验证必填字段
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({
        success: false,
        message: '吐槽内容不能为空'
      });
    }

    // 格式化为文本
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

    // 生成文件名（使用时间戳确保唯一性）
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `tucao-${dateStr}-${timeStr}.txt`;
    const filepath = path.join(tucaoDir, filename);

    // 写入文件
    fs.writeFileSync(filepath, textContent, 'utf-8');

    res.json({
      success: true,
      message: '吐槽已保存',
      filename: filename
    });
  } catch (error) {
    console.error('保存失败:', error);
    res.status(500).json({
      success: false,
      message: '保存失败：' + error.message
    });
  }
});

// 获取所有吐槽列表的API（供后续调取使用）
app.get('/api/feedback/list', (req, res) => {
  try {
    const files = fs.readdirSync(tucaoDir)
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const filepath = path.join(tucaoDir, file);
        const stats = fs.statSync(filepath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created); // 按创建时间倒序

    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('读取失败:', error);
    res.status(500).json({
      success: false,
      message: '读取失败：' + error.message
    });
  }
});

// 获取单个吐槽内容的API
app.get('/api/feedback/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(tucaoDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    res.json({
      success: true,
      content: content
    });
  } catch (error) {
    console.error('读取失败:', error);
    res.status(500).json({
      success: false,
      message: '读取失败：' + error.message
    });
  }
});

// 生产环境：托管前端静态资源
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
