Parse.Cloud.define('testStarpetsLogin', async (request) => {
    const { token, proxy, proxyPort } = request.params;
    
    const result = {
        success: false,
        message: '',
        status: null,
        balance: null,
        username: null,
        email: null,
        time: 0,
        proxy_used: proxy || 'none'
    };
    
    const startTime = Date.now();
    
    try {
        // Token decode
        const decodedToken = decodeURIComponent(token);
        const tokenData = JSON.parse(decodedToken);
        const accessToken = tokenData.accessToken;
        
        // JWT'den bilgi çek
        let username = 'Bilinmiyor';
        let email = 'Bilinmiyor';
        let expectedBalance = 'Bilinmiyor';
        try {
            const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
            username = payload.sub?.username || 'Bilinmiyor';
            email = payload.sub?.email || 'Bilinmiyor';
            expectedBalance = payload.sub?.balance?.usd || 'Bilinmiyor';
        } catch(e) {}
        
        // Proxy ayarları
        let fetchOptions = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': `jwtStateV2=${encodeURIComponent(JSON.stringify(tokenData))}`
            }
        };
        
        // Proxy kullan
        if (proxy && proxy !== '') {
            const proxyUrl = proxy.startsWith('http') ? proxy : `http://${proxy}`;
            const actualProxyPort = proxyPort || 6321;
            fetchOptions.agent = new (require('http').Agent)({
                proxy: proxyUrl + ':' + actualProxyPort
            });
            result.proxy_used = `${proxy}:${actualProxyPort}`;
        }
        
        const response = await fetch('https://starpets.gg/tr/adopt-me/', fetchOptions);
        const text = await response.text();
        const elapsed = (Date.now() - startTime) / 1000;
        
        result.time = elapsed.toFixed(2);
        result.status = response.status;
        
        if (response.status === 200) {
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('login') || lowerText.includes('sign in') || lowerText.includes('giris yap')) {
                result.success = false;
                result.message = 'Token gecersiz veya suresi dolmus. Login sayfasina yonlendirildi.';
            } else {
                result.success = true;
                result.message = 'Giris basarili!';
                result.username = username;
                result.email = email;
                result.expected_balance = expectedBalance;
                
                const balanceMatch = text.match(/(\d+\.?\d*)\s*USD/);
                if (balanceMatch) {
                    result.balance = balanceMatch[1] + ' USD';
                }
                
                const titleMatch = text.match(/<title>(.*?)<\/title>/i);
                if (titleMatch) {
                    result.page_title = titleMatch[1];
                }
            }
        } else if (response.status === 401) {
            result.message = 'Unauthorized - Token gecersiz veya suresi dolmus';
        } else if (response.status === 403) {
            result.message = 'Forbidden - IP veya cihaz engeli olabilir';
        } else {
            result.message = `HTTP ${response.status} - Beklenmeyen durum`;
        }
        
    } catch (error) {
        result.success = false;
        result.error = error.message;
        result.message = `Hata: ${error.message}`;
        result.time = ((Date.now() - startTime) / 1000).toFixed(2);
    }
    
    return result;
});
