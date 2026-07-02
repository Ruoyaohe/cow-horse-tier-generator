# 吐槽功能API使用说明

## 一、启动服务

### 方式1：同时启动前端和后端（推荐）

```bash
npm run dev:all
```

这将同时启动：
- 前端开发服务器：http://localhost:3000
- 后端API服务器：http://localhost:3001

### 方式2：分别启动

**终端1 - 启动前端：**
```bash
npm run dev
```

**终端2 - 启动后端：**
```bash
npm run dev:server
```

## 二、API接口

### 1. 保存吐槽

**接口地址：** `POST /api/feedback`

**请求体：**
```json
{
  "timestamp": "2026/01/08 14:30:25",
  "tier": "顶级金牌牛马",
  "score": 35,
  "profile": {
    "dailyHours": 13,
    "salaryRange": "3k-6k",
    "leaveDays": 0,
    "continuousDays": 15,
    "mealAllowance": 10
  },
  "feedback": "用户输入的吐槽内容"
}
```

**响应：**
```json
{
  "success": true,
  "message": "吐槽已保存",
  "filename": "tucao-2026-01-08-14-30-25.txt"
}
```

### 2. 获取吐槽列表

**接口地址：** `GET /api/feedback/list`

**响应：**
```json
{
  "success": true,
  "files": [
    {
      "filename": "tucao-2026-01-08-14-30-25.txt",
      "size": 1024,
      "created": "2026-01-08T14:30:25.000Z",
      "modified": "2026-01-08T14:30:25.000Z"
    }
  ]
}
```

### 3. 获取单个吐槽内容

**接口地址：** `GET /api/feedback/:filename`

**示例：** `GET /api/feedback/tucao-2026-01-08-14-30-25.txt`

**响应：**
```json
{
  "success": true,
  "content": "文件内容..."
}
```

## 三、文件存储

所有吐槽文件保存在：`public/tucao/` 目录

文件命名格式：`tucao-YYYY-MM-DD-HH-MM-SS.txt`

## 四、文件格式

每个吐槽文件包含以下信息：

```
【牛马吐槽 - 2026/01/08 14:30:25】
等级：顶级金牌牛马 (得分: 35)
工作数据：
  - 日均工时：13H
  - 月休天数：0D
  - 连续工作：15D
  - 伙食标准：10￥
  - 月薪区间：3k-6k

吐槽内容：
用户输入的吐槽内容...

==================================================
```

## 五、注意事项

1. 确保 `public/tucao` 文件夹存在且有写入权限
2. 后端服务器必须运行才能保存吐槽
3. 前端通过Vite代理访问后端API（`/api/*` -> `http://localhost:3001/api/*`）
4. 所有吐槽文件按时间顺序保存，方便后续调取和分析
