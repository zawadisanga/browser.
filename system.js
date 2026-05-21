// ============================================
// ZASS SYSTEM - ALL FUNCTIONS
// ============================================

const token = localStorage.getItem('token');
let currentUser = null;

// Check authentication on load
if (token) {
    fetchUser();
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('createPostBox').style.display = 'block';
}

// Fetch current user
async function fetchUser() {
    try {
        const response = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            document.getElementById('userAvatar').innerText = currentUser.username[0].toUpperCase();
            loadDashboard();
            loadFeed();
            loadMessages();
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

// ============ PAGE NAVIGATION ============
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    if (pageName === 'dashboard') loadDashboard();
    if (pageName === 'social') loadFeed();
    if (pageName === 'chat') loadMessages();
}

// ============ BROWSER FUNCTIONS ============
function browse() {
    let url = document.getElementById('browserUrl').value.trim();
    if (!url) return;
    if (!url.startsWith('http')) {
        if (url.includes('.')) {
            url = 'https://' + url;
        } else {
            url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
        }
    }
    document.getElementById('browserFrame').src = '/api/browse?url=' + encodeURIComponent(url);
}

function browserBack() {
    document.getElementById('browserFrame').contentWindow.history.back();
}

function browserForward() {
    document.getElementById('browserFrame').contentWindow.history.forward();
}

function browserReload() {
    document.getElementById('browserFrame').src = document.getElementById('browserFrame').src;
}

// ============ SEARCH FUNCTIONS ============
async function search() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.results.length > 0) {
            resultsDiv.innerHTML = data.results.map(result => `
                <div class="result-item" onclick="window.open('/api/browse?url=${encodeURIComponent(result.url)}', '_blank')">
                    <div class="result-title">${result.title || result.url}</div>
                    <div class="result-url">${result.url}</div>
                    <div class="result-snippet">${result.snippet || ''}</div>
                </div>
            `).join('');
        } else {
            resultsDiv.innerHTML = '<div style="text-align:center;padding:40px;">No results found.</div>';
        }
    } catch (error) {
        resultsDiv.innerHTML = '<div style="text-align:center;padding:40px;">Error searching. Please try again.</div>';
    }
}

// ============ SOCIAL FUNCTIONS ============
async function loadFeed() {
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        const container = document.getElementById('feedContainer');
        if (data.success && data.posts.length > 0) {
            container.innerHTML = data.posts.map(post => `
                <div class="post-card">
                    <div class="post-header">
                        <div class="post-avatar">${(post.username || 'U')[0].toUpperCase()}</div>
                        <div>
                            <div class="post-username">${post.username || 'User'}</div>
                            <div class="post-time">${new Date(post.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    <div class="post-actions">
                        <div class="post-action" onclick="likePost('${post.id}')">
                            <i class="fas fa-heart"></i> ${post.likes || 0}
                        </div>
                        <div class="post-action">
                            <i class="fas fa-comment"></i> ${post.comments?.length || 0}
                        </div>
                        <div class="post-action">
                            <i class="fas fa-share"></i> Share
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="text-align:center;padding:40px;">No posts yet. Be the first to post!</div>';
        }
    } catch (error) {
        console.error('Error loading feed:', error);
    }
}

async function createPost() {
    if (!token) {
        alert('Please login to post');
        return;
    }
    
    const content = document.getElementById('postContent').value.trim();
    if (!content) {
        alert('Please enter content');
        return;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('postContent').value = '';
            loadFeed();
        }
    } catch (error) {
        console.error('Error creating post:', error);
    }
}

async function likePost(postId) {
    if (!token) {
        alert('Please login to like');
        return;
    }
    
    try {
        await fetch(`/api/like/${postId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadFeed();
    } catch (error) {
        console.error('Error liking post:', error);
    }
}

// ============ MEDIA FUNCTIONS ============
async function getMediaInfo() {
    const url = document.getElementById('mediaUrl').value.trim();
    if (!url) {
        alert('Enter a YouTube URL');
        return;
    }
    
    const infoDiv = document.getElementById('mediaInfo');
    infoDiv.innerHTML = '<div style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const response = await fetch(`/api/media/info?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.success) {
            infoDiv.innerHTML = `
                <div class="media-info">
                    <img class="media-thumbnail" src="${data.thumbnail}" alt="Thumbnail">
                    <h3>${data.title}</h3>
                    <p>Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2,'0')}</p>
                    <button class="download-btn" onclick="downloadVideo()">Download Video</button>
                    <button class="download-btn" onclick="downloadAudio()">Download Audio (MP3)</button>
                </div>
            `;
        } else {
            infoDiv.innerHTML = '<div class="media-info"><p>Error: ' + (data.error || 'Could not fetch info') + '</p></div>';
        }
    } catch (error) {
        infoDiv.innerHTML = '<div class="media-info"><p>Error loading video info</p></div>';
    }
}

function downloadVideo() {
    const url = document.getElementById('mediaUrl').value.trim();
    if (url) {
        window.location.href = `/api/media/download?url=${encodeURIComponent(url)}&audioOnly=false`;
    }
}

function downloadAudio() {
    const url = document.getElementById('mediaUrl').value.trim();
    if (url) {
        window.location.href = `/api/media/download?url=${encodeURIComponent(url)}&audioOnly=true`;
    }
}

// ============ DASHBOARD FUNCTIONS ============
async function loadDashboard() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        document.getElementById('statUsers').innerText = data.users || 0;
        document.getElementById('statPosts').innerText = data.posts || 0;
        document.getElementById('statMessages').innerText = data.messages || 0;
        document.getElementById('statUptime').innerText = Math.floor(data.uptime || 0);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============ AUTH FUNCTIONS ============
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            window.location.reload();
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    
    if (password !== confirm) {
        alert('Passwords do not match');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            window.location.reload();
        } else {
            alert('Registration failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.reload();
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchToRegister() {
    closeModal('loginModal');
    showRegisterModal();
}

function switchToLogin() {
    closeModal('registerModal');
    showLoginModal();
}
