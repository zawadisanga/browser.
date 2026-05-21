// ============================================
// ZASS APP - MAIN INITIALIZATION
// ============================================

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('ZASS Ecosystem loaded');
    
    // Set default browser URL
    const browserUrlInput = document.getElementById('browserUrl');
    if (browserUrlInput) {
        browserUrlInput.value = 'https://www.google.com';
    }
    
    // Load initial data if user is logged in
    if (token) {
        loadDashboard();
        loadFeed();
        loadMessages();
    }
});

// Global variables
window.token = localStorage.getItem('token');
window.currentUser = null;

// Export functions to global scope
window.showPage = showPage;
window.browse = browse;
window.browserBack = browserBack;
window.browserForward = browserForward;
window.browserReload = browserReload;
window.search = search;
window.createPost = createPost;
window.likePost = likePost;
window.getMediaInfo = getMediaInfo;
window.downloadVideo = downloadVideo;
window.downloadAudio = downloadAudio;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeModal = closeModal;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.sendMessage = sendMessage;
