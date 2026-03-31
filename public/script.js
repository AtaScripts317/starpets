 // Back4App yapılandırması (kendi uygulamanla değiştir)
Parse.initialize("l54T01o7jvdkUGKJJZau0LQ6rggbqqOZfZsnAfNI", "QrgvxaEWdCk6elj8o3eeePOPM5vYj2fMrY4FHlhj");
Parse.serverURL = "https://parseapi.back4app.com/";

// DOM elementleri
const tokenInput = document.getElementById('tokenInput');
const decodeBtn = document.getElementById('decodeBtn');
const tokenInfo = document.getElementById('tokenInfo');
const proxyList = document.getElementById('proxyList');
const useOwnIp = document.getElementById('useOwnIp');
const checkBalance = document.getElementById('checkBalance');
const checkInventory = document.getElementById('checkInventory');
const startTest = document.getElementById('startTest');
const resultsContainer = document.getElementById('results');
const summaryDiv = document.getElementById('summary');

// Token decode et
decodeBtn.addEventListener('click', () => {
    const encoded = tokenInput.value.trim();
    if (!encoded) {
        alert('Lütfen token girin');
        return;
    }
    
    try {
        const decoded = decodeURIComponent(encoded);
        const tokenData = JSON.parse(decoded);
        
        tokenInfo.classList.remove('hidden');
        tokenInfo.innerHTML = `
            <strong>✅ Token Decode Edildi</strong><br>
            Access Token: ${tokenData.accessToken.substring(0, 50)}...<br>
            Refresh Token: ${tokenData.refreshToken.substring(0, 50)}...<br>
            <span style="color: #48bb78;">Token uzunluğu: ${decoded.length} karakter</span>
        `;
    } catch (e) {
        tokenInfo.classList.remove('hidden');
        tokenInfo.innerHTML = `<span style="color: #f56565;">❌ Decode hatası: ${e.message}</span>`;
    }
});

// Test başlat
startTest.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
        alert('Lütfen token girin');
        return;
    }
    
    // Proxy listesini parse et
    let proxies = [];
    const proxyText = proxyList.value.trim();
    if (proxyText) {
        proxies = proxyText.split('\n').filter(p => p.trim());
    }
    
    if (useOwnIp.checked) {
        proxies.unshift(null); // null = kendi IP
    }
    
    if (proxies.length === 0) {
        alert('En az bir proxy girin veya "Kendi IP\'mi kullan" seçeneğini işaretleyin');
        return;
    }
    
    // UI'ı temizle
    resultsContainer.innerHTML = '<div class="loading">Test yapılıyor...</div>';
    summaryDiv.classList.add('hidden');
    
    // Cloud function'ı çağır
    try {
        const results = await Parse.Cloud.run('testStarpetsToken', {
            token: token,
            proxies: proxies,
            options: {
                checkBalance: checkBalance.checked,
                checkInventory: checkInventory.checked
            }
        });
        
        displayResults(results);
        
    } catch (error) {
        resultsContainer.innerHTML = `<div class="result-item error">
            <div class="header">❌ Hata</div>
            <div>${error.message}</div>
        </div>`;
    }
});

// Sonuçları göster
function displayResults(results) {
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state">Sonuç bulunamadı</div>';
        return;
    }
    
    let successCount = 0;
    let failCount = 0;
    let html = '';
    
    results.forEach((result, index) => {
        if (result.success) successCount++;
        else failCount++;
        
        const statusClass = result.success ? 'success' : 'error';
        const statusIcon = result.success ? '✅' : '❌';
        
        html += `
            <div class="result-item ${statusClass}">
                <div class="header">
                    <span class="ip">${statusIcon} Test #${index + 1}: ${result.ip || 'Kendi IP'}</span>
                    <span class="status">${result.status || '-'}</span>
                </div>
                <div>${result.message}</div>
                <div class="details">
                    ⏱️ Süre: ${result.time}s
                    ${result.balance ? ` | 💰 Bakiye: ${result.balance}` : ''}
                    ${result.title ? ` | 📄 ${result.title.substring(0, 50)}` : ''}
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    
    summaryDiv.classList.remove('hidden');
    summaryDiv.innerHTML = `
        <div class="summary">
            <span class="success-count">✅ ${successCount}</span> başarılı / 
            <span class="fail-count">❌ ${failCount}</span> başarısız
            <br><br>
            ${successCount > 0 ? '💡 Token geçerli görünüyor. Giriş sorunu IP/cihaz bazlı olabilir.' : '⚠️ Token geçersiz veya süresi dolmuş olabilir.'}
        </div>
    `;
}
