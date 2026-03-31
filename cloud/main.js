Parse.Cloud.define('testStarpetsLogin', async (request) => {
    const { token } = request.params;
    
    const result = {
        success: false,
        message: '',
        status: null,
        balance: null,
        username: null,
        time: 0
    };
    
    const startTime = Date.now();
    
    try {
        // Token decode
        const decodedToken = decodeURIComponent(token);
        const tokenData = JSON.parse(decodedToken);
        
        // Starpets'e istek at
        const response = await fetch('https://starpets.gg/tr/adopt-me/', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': `jwtStateV2=${encodeURIComponent(JSON.stringify(tokenData))}`
            }
        });
        
        const text = await response.text();
        const elapsed = (Date.now() - startTime) / 1000;
        
        result.time = elapsed.toFixed(2);
        result.status = response.status;
        
        if (response.status === 200) {
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('login') || lowerText.includes('sign in') || lowerText.includes('giris yap')) {
                result.success = false;
                result.message = 'Token gecersiz veya suresi dolmus';
            } else {
                result.success = true;
                result.message = 'Giris basarili!';
                
                // JWT'den kullanıcı bilgisi çek
                try {
                    const payload = JSON.parse(Buffer.from(tokenData.accessToken.split('.')[1], 'base64').toString());
                    result.username = payload.sub?.username || 'Bilinmiyor';
                    result.email = payload.sub?.email || 'Bilinmiyor';
                    result.balance = payload.sub?.balance?.usd || '0';
                } catch(e) {}
                
                // Sayfadan bakiye bul
                const balanceMatch = text.match(/(\d+\.?\d*)\s*USD/);
                if (balanceMatch) {
                    result.page_balance = balanceMatch[1] + ' USD';
                }
            }
        } else if (response.status === 401) {
            result.message = 'Token gecersiz veya suresi dolmus';
        } else if (response.status === 403) {
            result.message = 'IP veya cihaz engeli olabilir';
        } else {
            result.message = `HTTP ${response.status}`;
        }
        
    } catch (error) {
        result.success = false;
        result.message = `Hata: ${error.message}`;
        result.time = ((Date.now() - startTime) / 1000).toFixed(2);
    }
    
    return result;
});
