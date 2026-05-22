// server.js - RENDER OPTIMIZED VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Browser manager
let browser = null;
let isReady = false;

async function initBrowser() {
    console.log('🚀 Starting browser on Render...');
    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        isReady = true;
        console.log('✅ Browser ready on Render!');
    } catch (error) {
        console.error('Browser error:', error);
        setTimeout(initBrowser, 10000);
    }
}

// ==================== SIMPLE AUTH (NO DATABASE FOR NOW) ====================
// Hardcoded admin for testing
const ADMIN_EMAIL = 'admin@cloudbrowser.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_API_KEY = 'admin_test_key_123';

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log(`Login attempt: ${email}`);
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        res.json({
            success: true,
            token: 'test_token_123',
            user: {
                id: 1,
                email: ADMIN_EMAIL,
                full_name: 'Administrator',
                plan: 'enterprise',
                api_key: ADMIN_API_KEY,
                daily_limit: 10000
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Register endpoint
app.post('/api/register', (req, res) => {
    const { email, password, full_name } = req.body;
    
    console.log(`Register attempt: ${email}`);
    
    res.json({
        success: true,
        message: 'User registered successfully',
        api_key: 'ck_' + Date.now(),
        plan: 'free',
        daily_limit: 100
    });
});

// Get user info
app.get('/api/user', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({
        user: {
            id: 1,
            email: ADMIN_EMAIL,
            full_name: 'Administrator',
            plan: 'enterprise',
            api_key: ADMIN_API_KEY,
            daily_limit: 10000
        },
        usage: {
            today: 0,
            total: 0,
            remaining: 10000
        }
    });
});

// Screenshot endpoint
app.get('/api/screenshot', async (req, res) => {
    const { url } = req.query;
    const apiKey = req.headers['x-api-key'];
    
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    
    if (!isReady || !browser) {
        return res.status(503).json({ error: 'Browser starting, please wait 30 seconds' });
    }
    
    let page = null;
    try {
        page = await browser.newPage();
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const screenshot = await page.screenshot({ fullPage: false });
        
        res.setHeader('Content-Type', 'image/png');
        res.send(screenshot);
    } catch (error) {
        console.error('Screenshot error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (page) await page.close();
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: isReady ? 'ready' : 'starting',
        browser: browser ? 'active' : 'inactive',
        timestamp: new Date().toISOString()
    });
});

// Frontend routes
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

// Start server
initBrowser();
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});
