// server.js - OPTIMIZED FOR HEROKU FREE TIER
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let browser = null;
let isBrowserReady = false;
let browserStartTime = null;

async function initBrowser() {
    console.log('🚀 Starting browser (Heroku free tier optimized)...');
    browserStartTime = Date.now();
    
    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--memory-pressure-off',
                '--max_old_space_size=256'
            ]
        });
        
        // Quick test to ensure browser works
        const page = await browser.newPage();
        await page.goto('about:blank');
        await page.close();
        
        isBrowserReady = true;
        console.log(`✅ Browser ready! (took ${(Date.now() - browserStartTime) / 1000} seconds)`);
    } catch (error) {
        console.error('Browser failed:', error);
        isBrowserReady = false;
        // Retry after 10 seconds
        setTimeout(initBrowser, 10000);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: isBrowserReady ? 'ready' : 'starting',
        browser: browser ? 'active' : 'inactive',
        uptime: browserStartTime ? Math.floor((Date.now() - browserStartTime) / 1000) : 0
    });
});

// Screenshot endpoint
app.get('/api/screenshot', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }
    
    if (!isBrowserReady || !browser) {
        return res.status(503).json({ 
            error: 'Browser is starting, please wait...',
            status: 'starting',
            waitTime: browserStartTime ? Math.floor((Date.now() - browserStartTime) / 1000) : 0
        });
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
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});
