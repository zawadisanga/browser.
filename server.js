// server.js - ULTIMATE PROFESSIONAL CLOUD BROWSER
// Inafanya kazi Heroku free tier - Best in Class!
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { chromium } = require('playwright');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cloud-browser-ultimate-secret-key-2024';
const SALT_ROUNDS = 10;

// ==================== CREATE DIRECTORIES ====================
const dbDir = './database';
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// ==================== DATABASE SETUP ====================
let db;

async function initDatabase() {
    try {
        db = await open({
            filename: './database/database.sqlite',
            driver: sqlite3.Database
        });
        
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                plan TEXT DEFAULT 'free',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                api_key TEXT UNIQUE,
                daily_limit INTEGER DEFAULT 100,
                monthly_limit INTEGER DEFAULT 3000
            )
        `);
        
        await db.exec(`
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                api_key TEXT,
                endpoint TEXT,
                url TEXT,
                format TEXT,
                success BOOLEAN,
                response_time INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        
        console.log('✅ Database initialized');
        
        const adminExists = await db.get('SELECT * FROM users WHERE email = ?', ['admin@cloudbrowser.com']);
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
            const apiKey = 'ultimate_' + uuidv4().replace(/-/g, '');
            await db.run(
                'INSERT INTO users (email, password, full_name, plan, api_key, daily_limit, monthly_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['admin@cloudbrowser.com', hashedPassword, 'Administrator', 'enterprise', apiKey, 10000, 100000]
            );
            console.log('✅ Admin: admin@cloudbrowser.com / admin123');
        }
        return true;
    } catch (error) {
        console.error('Database error:', error);
        return false;
    }
}

// ==================== MIDDLEWARE ====================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Rate limit exceeded' }
});
app.use('/api/', globalLimiter);

// ==================== ULTIMATE BROWSER POOL MANAGER ====================
class UltimateBrowserPool {
    constructor() {
        this.workers = [];
        this.maxWorkers = 2; // 2 workers inafanya kazi free tier!
        this.available = [];
        this.busy = new Set();
        this.isReady = false;
        this.stats = {
            requests: 0,
            cacheHits: 0,
            errors: 0,
            startTime: Date.now()
        };
        this.cache = new Map();
    }

    async init() {
        console.log(`🚀 Launching Ultimate Browser Pool with ${this.maxWorkers} workers...`);
        
        for (let i = 0; i < this.maxWorkers; i++) {
            try {
                const worker = await chromium.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-software-rasterizer',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-background-timer-throttling',
                        '--memory-pressure-off',
                        '--max_old_space_size=256'
                    ]
                });
                this.workers.push(worker);
                this.available.push(worker);
                console.log(`✅ Worker ${i + 1} ready`);
            } catch (error) {
                console.error(`Worker ${i + 1} failed:`, error);
            }
        }
        
        this.isReady = this.available.length > 0;
        
        if (this.isReady) {
            console.log(`🎉 ${this.available.length} browsers ready for action!`);
        } else {
            console.log('⚠️ No browsers available - retrying in 10 seconds...');
            setTimeout(() => this.init(), 10000);
        }
        
        // Clear cache every hour
        setInterval(() => this.cache.clear(), 3600000);
    }

    async capture(url, options = {}) {
        this.stats.requests++;
        
        const cacheKey = `${url}:${options.format || 'png'}`;
        if (this.cache.has(cacheKey) && !options.skipCache) {
            this.stats.cacheHits++;
            return { data: this.cache.get(cacheKey), fromCache: true };
        }
        
        if (!this.isReady || this.available.length === 0) {
            throw new Error('Browsers are starting. Please wait 30 seconds.');
        }
        
        const worker = this.available.pop();
        this.busy.add(worker);
        let page = null;
        
        try {
            page = await worker.newPage();
            await page.setViewportSize({ width: 1920, height: 1080 });
            await page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: options.timeout || 25000 
            });
            
            let result;
            if (options.format === 'pdf') {
                result = await page.pdf({ format: 'A4', printBackground: true });
            } else {
                result = await page.screenshot({ fullPage: false, type: 'png' });
            }
            
            this.cache.set(cacheKey, result);
            setTimeout(() => this.cache.delete(cacheKey), 3600000);
            
            return { data: result, fromCache: false };
        } catch (error) {
            this.stats.errors++;
            throw error;
        } finally {
            if (page) await page.close();
            this.busy.delete(worker);
            this.available.push(worker);
        }
    }

    getStats() {
        return {
            requests: this.stats.requests,
            cacheHits: this.stats.cacheHits,
            errors: this.stats.errors,
            cacheHitRate: this.stats.requests > 0 ? ((this.stats.cacheHits / this.stats.requests) * 100).toFixed(2) : 0,
            uptime: Math.floor((Date.now() - this.stats.startTime) / 1000),
            workers: {
                available: this.available.length,
                busy: this.busy.size,
                total: this.available.length + this.busy.size
            },
            ready: this.isReady
        };
    }
}

const browserPool = new UltimateBrowserPool();

// ==================== AUTHENTICATION ====================
async function authenticateAPIKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required. Get one at /register' });
    }
    
    try {
        const user = await db.get('SELECT * FROM users WHERE api_key = ?', [apiKey]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const todayUsage = await db.get(
            'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND date(created_at) = ?',
            [user.id, today]
        );
        
        if (todayUsage.count >= user.daily_limit) {
            return res.status(429).json({ error: 'Daily limit reached. Upgrade your plan!' });
        }
        
        req.user = user;
        req.apiKey = apiKey;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication error' });
    }
}

async function authenticateJWT(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        if (!user) return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

async function logUsage(userId, apiKey, endpoint, url, format, success, responseTime) {
    try {
        await db.run(
            'INSERT INTO usage_logs (user_id, api_key, endpoint, url, format, success, response_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, apiKey, endpoint, url, format, success ? 1 : 0, responseTime]
        );
    } catch (error) {
        console.error('Log error:', error);
    }
}

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: browserPool.isReady ? 'ready' : 'starting',
        version: 'ULTIMATE EDITION',
        timestamp: new Date().toISOString(),
        ...browserPool.getStats()
    });
});

// Register
app.post('/api/register', async (req, res) => {
    const { email, password, full_name } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    try {
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const apiKey = 'ck_' + uuidv4().replace(/-/g, '');
        
        await db.run(
            'INSERT INTO users (email, password, full_name, api_key, plan, daily_limit, monthly_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, full_name || email.split('@')[0], apiKey, 'free', 100, 3000]
        );
        
        res.json({ 
            success: true, 
            message: 'Account created!',
            api_key: apiKey,
            plan: 'free',
            daily_limit: 100
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                plan: user.plan,
                api_key: user.api_key,
                daily_limit: user.daily_limit
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get user info
app.get('/api/user', authenticateJWT, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const todayUsage = await db.get(
            'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND date(created_at) = ?',
            [req.user.id, today]
        );
        
        const totalUsage = await db.get(
            'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ?',
            [req.user.id]
        );
        
        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                full_name: req.user.full_name,
                plan: req.user.plan,
                api_key: req.user.api_key,
                daily_limit: req.user.daily_limit
            },
            usage: {
                today: todayUsage.count,
                total: totalUsage.count,
                remaining: Math.max(0, req.user.daily_limit - todayUsage.count)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Screenshot endpoint
app.get('/api/screenshot', authenticateAPIKey, async (req, res) => {
    const startTime = Date.now();
    const { url } = req.query;
    
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    try {
        new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    try {
        const result = await browserPool.capture(url, { format: 'png' });
        const responseTime = Date.now() - startTime;
        await logUsage(req.user.id, req.apiKey, '/screenshot', url, 'png', true, responseTime);
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('X-Cache', result.fromCache ? 'HIT' : 'MISS');
        res.setHeader('X-Remaining-Today', req.user.daily_limit - 1);
        res.send(result.data);
    } catch (error) {
        await logUsage(req.user.id, req.apiKey, '/screenshot', url, 'png', false, Date.now() - startTime);
        res.status(500).json({ error: error.message });
    }
});

// PDF endpoint
app.get('/api/pdf', authenticateAPIKey, async (req, res) => {
    const startTime = Date.now();
    const { url } = req.query;
    
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    try {
        const result = await browserPool.capture(url, { format: 'pdf' });
        await logUsage(req.user.id, req.apiKey, '/pdf', url, 'pdf', true, Date.now() - startTime);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="document-${Date.now()}.pdf"`);
        res.send(result.data);
    } catch (error) {
        await logUsage(req.user.id, req.apiKey, '/pdf', url, 'pdf', false, Date.now() - startTime);
        res.status(500).json({ error: error.message });
    }
});

// Batch endpoint
app.post('/api/batch', authenticateAPIKey, async (req, res) => {
    const startTime = Date.now();
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'URLs array required' });
    }
    
    if (urls.length > 10) return res.status(400).json({ error: 'Max 10 URLs per batch' });
    
    const results = [];
    for (const url of urls.slice(0, 10)) {
        try {
            const result = await browserPool.capture(url, { skipCache: false });
            results.push({ url, success: true, data: result.data.toString('base64') });
            await logUsage(req.user.id, req.apiKey, '/batch', url, 'png', true, 0);
        } catch (error) {
            results.push({ url, success: false, error: error.message });
            await logUsage(req.user.id, req.apiKey, '/batch', url, 'png', false, 0);
        }
    }
    
    res.json({
        batchId: Date.now(),
        processingTime: Date.now() - startTime,
        total: urls.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    });
});

// Stats endpoint
app.get('/api/stats', authenticateAPIKey, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = await db.get(
        'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND date(created_at) = ?',
        [req.user.id, today]
    );
    
    res.json({
        system: browserPool.getStats(),
        user: {
            plan: req.user.plan,
            used_today: todayUsage.count,
            daily_limit: req.user.daily_limit,
            remaining: req.user.daily_limit - todayUsage.count,
            api_key: req.user.api_key
        }
    });
});

// ==================== FRONTEND ROUTES ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});

// ==================== START SERVER ====================
async function startServer() {
    console.log('🌟 ULTIMATE CLOUD BROWSER STARTING...');
    console.log('=======================================');
    
    await initDatabase();
    await browserPool.init();
    
    app.listen(PORT, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                                                              ║');
        console.log('║   🌟 ULTIMATE CLOUD BROWSER - PROFESSIONAL EDITION           ║');
        console.log('║   ==============================================            ║');
        console.log('║                                                              ║');
        console.log(`║   🟢 RUNNING on port: ${PORT}                                  ║`);
        console.log(`║   🧠 Workers: ${browserPool.maxWorkers}                         ║`);
        console.log('║                                                              ║');
        console.log('║   📱 Frontend:                                               ║');
        console.log(`║   ├── Dashboard: http://localhost:${PORT}/dashboard.html      ║`);
        console.log(`║   ├── Login:     http://localhost:${PORT}/login.html          ║`);
        console.log(`║   ├── Register:  http://localhost:${PORT}/register.html       ║`);
        console.log('║                                                              ║');
        console.log('║   🔑 Test Accounts:                                          ║');
        console.log('║   ├── Admin: admin@cloudbrowser.com / admin123               ║');
        console.log('║   └── Register new user at /register.html                    ║');
        console.log('║                                                              ║');
        console.log('║   📡 API Endpoints:                                          ║');
        console.log('║   ├── GET  /api/screenshot?url=...                          ║');
        console.log('║   ├── GET  /api/pdf?url=...                                 ║');
        console.log('║   ├── POST /api/batch                                       ║');
        console.log('║   ├── GET  /api/stats                                       ║');
        console.log('║   └── GET  /health                                          ║');
        console.log('║                                                              ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('💡 TIP: Browser takes 20-30 seconds to start on Heroku free tier.');
        console.log('   Check /health for status. When "ready": true, you can capture!');
    });
}

startServer().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
