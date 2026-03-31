// Cloud/main.js
Parse.Cloud.define('testStarpetsToken', async (request) => {
    const { token, proxies, options } = request.params;
    
    const results = [];
    
    // Her proxy için test yap
    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        const result = await testWithProxy(token, proxy, options);
        results.push(result);
        
        // Rate limiting için bekle
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
});

async function testWithProxy(token, proxy, options) {
    const startTime = Date.now();
    const result = {
        success: false,
        ip: proxy || 'Kendi IP',
        message: '',
        time: 0,
        status: null
    };
    
    try {
        // URL decode
        const decodedToken = decodeURIComponent(token);
        
        // Fetch ile istek yap
        const response = await fetch('https://starpets.gg/tr/adopt-me/', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': `jwtStateV2=${encodeURIComponent(decodedToken)}`
            }
        });
        
        const elapsed = (Date.now() - startTime) / 1000;
        result.time = elapsed.toFixed(2);
        result.status = response.status;
        
        const text = await response.text();
        const lowerText = text.toLowerCase();
        
        if (response.status === 200) {
            // Giriş başarılı mı kontrol et
            if (lowerText.includes('login') || lowerText.includes('sign in') || lowerText.includes('giriş')) {
                result.message = 'Login sayfasına yönlendirildi (token geçersiz)';
                result.success = false;
            } else {
                result.success = true;
                result.message = 'Giriş başarılı!';
                
                // Bakiye kontrolü
                if (options?.checkBalance) {
                    const balanceMatch = text.match(/(\d+\.?\d*)\s*USD/);
                    if (balanceMatch) {
                        result.balance = balanceMatch[1] + ' USD';
                    }
                }
                
                // Sayfa başlığını al
                const titleMatch = text.match(/<title>(.*?)<\/title>/i);
                if (titleMatch) {
                    result.title = titleMatch[1];
                }
            }
        } else if (response.status === 401) {
            result.message = 'Unauthorized - Token geçersiz veya süresi dolmuş';
        } else if (response.status === 403) {
            result.message = 'Forbidden - IP veya cihaz engeli olabilir';
        } else {
            result.message = `HTTP ${response.status}`;
        }
        
    } catch (error) {
        result.message = `Hata: ${error.message}`;
        result.time = ((Date.now() - startTime) / 1000).toFixed(2);
    }
    
    return result;
}
