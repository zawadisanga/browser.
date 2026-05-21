// ============================================
// ZASS ULTIMATE ECOSYSTEM - MAIN SERVER
// ============================================

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ytdl = require('ytdl-core');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 16232;

// ============ MIDDLEWARE ============
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.')); // Serve all files from root directory

// ============ DATA STORAGE ============
let users = [];
let posts = [];
let messages = [];
let bookmarks = [];
let history = [];

// Default Admin
users.push({
    id: '1',
    username: 'admin',
    email: 'admin@zass.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=667eea&color=fff',
    createdAt: new Date()
});

// ============ AUTH MIDDLEWARE ============
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, 'zass-secret-key-2024');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// ============ AUTH ROUTES ============
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username exists' });
    }
    
    const newUser = {
        id: uuidv4(),
        username,
        email,
        password: bcrypt.hashSync(password, 10),
        role: 'user',
        avatar: `https://ui-avatars.com/api/?name=${username}&background=667eea&color=fff`,
        createdAt: new Date()
    };
    
    users.push(newUser);
    
    const token = jwt.sign(
        { id: newUser.id, username: newUser.username, role: newUser.role },
        'zass-secret-key-2024',
        { expiresIn: '30d' }
    );
    
    res.json({ success: true, token, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        'zass-secret-key-2024',
        { expiresIn: '30d' }
    );
    
    res.json({ success: true, token, user });
});

app.get('/api/me', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    res.json({ success: true, user });
});

// ============ BROWSER ROUTES ============
app.get('/api/browse', async (req, res) => {
    let { url } = req.query;
    
    if (!url) {
        return res.status(400).send('<h1>URL required</h1>');
    }
    
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        const title = $('title').text() || url;
        
        const enhancedHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - ZASS Browser</title>
                <style>
                    .toolbar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: white;
                        border-bottom: 1px solid #ccc;
                        padding: 8px;
                        display: flex;
                        gap: 8px;
                        z-index: 10000;
                        flex-wrap: wrap;
                    }
                    .url-bar {
                        flex: 1;
                        display: flex;
                        background: #f5f5f5;
                        border-radius: 20px;
                        padding: 8px 16px;
                    }
                    .url-input {
                        flex: 1;
                        border: none;
                        background: transparent;
                        outline: none;
                    }
                    .go-btn {
                        background: #1a73e8;
                        color: white;
                        border: none;
                        border-radius: 20px;
                        padding: 8px 16px;
                        cursor: pointer;
                    }
                    .content {
                        margin-top: 60px;
                        padding: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <button onclick="goBack()">← Back</button>
                    <button onclick="goForward()">→ Forward</button>
                    <button onclick="reloadPage()">⟳ Reload</button>
                    <div class="url-bar">
                        <input type="text" class="url-input" id="urlInput" value="${url}" placeholder="Enter URL...">
                    </div>
                    <button class="go-btn" onclick="navigate()">Go</button>
                </div>
                <div class="content">
                    ${$.html()}
                </div>
                <script>
                    function navigate() {
                        let url = document.getElementById('urlInput').value;
                        if (!url.startsWith('http')) url = 'https://' + url;
                        window.location.href = '/api/browse?url=' + encodeURIComponent(url);
                    }
                    function goBack() { window.history.back(); }
                    function goForward() { window.history.forward(); }
                    function reloadPage() { location.reload(); }
                </script>
            </body>
            </html>
        `;
        
        res.send(enhancedHtml);
    } catch (error) {
        res.send(`<h1>Error: ${error.message}</h1><a href="/">Go Home</a>`);
    }
});

// ============ SEARCH ROUTE ============
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Search query required' });
    }
    
    try {
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(q)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const $ = cheerio.load(response.data);
        let results = [];
        
        $('div.g').each((i, el) => {
            const title = $(el).find('h3').text();
            let link = $(el).find('a').attr('href');
            const snippet = $(el).find('.VwiC3b').text();
            
            if (link && link.startsWith('/url?q=')) {
                link = decodeURIComponent(link.replace('/url?q=', '').split('&')[0]);
            }
            
            if (title && link && link.startsWith('http') && i < 20) {
                results.push({ title, url: link, snippet: snippet?.substring(0, 300) });
            }
        });
        
        res.json({ success: true, query: q, results });
    } catch (error) {
        res.json({ success: false, error: error.message, results: [] });
    }
});

// ============ CHAT ROUTES ============
app.get('/api/messages', authMiddleware, (req, res) => {
    res.json({ success: true, messages: messages.slice(-50) });
});

app.post('/api/messages', authMiddleware, (req, res) => {
    const { message } = req.body;
    
    const newMessage = {
        id: uuidv4(),
        userId: req.user.id,
        username: req.user.username,
        message,
        timestamp: new Date()
    };
    
    messages.push(newMessage);
    res.json({ success: true, message: newMessage });
});

// ============ SOCIAL ROUTES ============
app.get('/api/posts', (req, res) => {
    res.json({ success: true, posts: posts.slice(-50) });
});

app.post('/api/posts', authMiddleware, (req, res) => {
    const { content } = req.body;
    
    const newPost = {
        id: uuidv4(),
        userId: req.user.id,
        username: req.user.username,
        content,
        likes: 0,
        comments: [],
        createdAt: new Date()
    };
    
    posts.unshift(newPost);
    res.json({ success: true, post: newPost });
});

app.post('/api/like/:postId', authMiddleware, (req, res) => {
    const post = posts.find(p => p.id === req.params.postId);
    if (post) {
        post.likes++;
        res.json({ success: true, likes: post.likes });
    } else {
        res.status(404).json({ error: 'Post not found' });
    }
});

// ============ MEDIA ROUTES ============
app.get('/api/media/info', async (req, res) => {
    const { url } = req.query;
    
    if (!url || !url.includes('youtube.com')) {
        return res.json({ success: false, error: 'YouTube URL required' });
    }
    
    try {
        const info = await ytdl.getInfo(url);
        res.json({
            success: true,
            title: info.videoDetails.title,
            duration: info.videoDetails.lengthSeconds,
            thumbnail: info.videoDetails.thumbnails[0]?.url
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/media/download', async (req, res) => {
    const { url, audioOnly = 'false' } = req.query;
    
    if (!url || !url.includes('youtube.com')) {
        return res.status(400).json({ error: 'YouTube URL required' });
    }
    
    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        const filename = audioOnly === 'true' ? `${title}.mp3` : `${title}.mp4`;
        
        const options = audioOnly === 'true' 
            ? { filter: 'audioonly', quality: 'highestaudio' }
            : { quality: 'highest' };
        
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Type', audioOnly === 'true' ? 'audio/mpeg' : 'video/mp4');
        
        ytdl(url, options).pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        users: users.length,
        posts: posts.length,
        messages: messages.length,
        timestamp: new Date()
    });
});

// ============ SERVE HTML FILES ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ============ START SERVER ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║              ZASS ULTIMATE ECOSYSTEM - RUNNING                 ║
╠════════════════════════════════════════════════════════════════╣
║  🚀 Server: http://localhost:${PORT}                           ║
║  🌐 Browser: http://localhost:${PORT}/api/browse?url=          ║
║  🔍 Search: http://localhost:${PORT}/api/search?q=             ║
║  💬 Chat: http://localhost:${PORT}/#chat                       ║
║  📱 Social: http://localhost:${PORT}/#social                   ║
║  🎬 Media: http://localhost:${PORT}/#media                     ║
║                                                                ║
║  🔐 Default Login: admin / admin123                            ║
╚════════════════════════════════════════════════════════════════╝
    `);
});
