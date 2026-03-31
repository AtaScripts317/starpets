// ==================== 1. TOKEN TEST ====================
Parse.Cloud.define('testStarpetsLogin', async (request) => {
    const { token } = request.params;
    
    const result = {
        success: false,
        message: '',
        status: null,
        balance: null,
        username: null,
        email: null,
        time: 0
    };
    
    const startTime = Date.now();
    
    try {
        const decodedToken = decodeURIComponent(token);
        const tokenData = JSON.parse(decodedToken);
        
        const response = await fetch('https://starpets.gg/tr/adopt-me/', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'Cookie': `jwtStateV2=${encodeURIComponent(JSON.stringify(tokenData))}`
            }
        });
        
        const text = await response.text();
        result.time = ((Date.now() - startTime) / 1000).toFixed(2);
        result.status = response.status;
        
        if (response.status === 200 && !text.toLowerCase().includes('login')) {
            result.success = true;
            result.message = 'Giris basarili!';
            
            try {
                const payload = JSON.parse(Buffer.from(tokenData.accessToken.split('.')[1], 'base64').toString());
                result.username = payload.sub?.username || 'Bilinmiyor';
                result.email = payload.sub?.email || 'Bilinmiyor';
                result.balance = payload.sub?.balance?.usd || '0';
            } catch(e) {}
            
            const balanceMatch = text.match(/(\d+\.?\d*)\s*USD/);
            if (balanceMatch) result.page_balance = balanceMatch[1] + ' USD';
        } else {
            result.message = 'Token gecersiz veya suresi dolmus';
        }
        
    } catch (error) {
        result.message = `Hata: ${error.message}`;
        result.time = ((Date.now() - startTime) / 1000).toFixed(2);
    }
    
    return result;
});

// ==================== 2. ÖZEL PAYLOAD ====================
Parse.Cloud.define('sendPayload', async (request) => {
    const { method, url, headers, body } = request.params;
    
    const startTime = Date.now();
    const result = { status: null, responseText: null, time: 0, error: null };
    
    try {
        const options = {
            method: method || 'GET',
            headers: headers || {}
        };
        
        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
            if (!options.headers['Content-Type']) {
                options.headers['Content-Type'] = 'application/json';
            }
        }
        
        const response = await fetch(url, options);
        const responseText = await response.text();
        
        result.status = response.status;
        result.responseText = responseText.length > 2000 ? responseText.substring(0, 2000) + '...' : responseText;
        result.time = ((Date.now() - startTime) / 1000).toFixed(2);
        
    } catch (error) {
        result.error = error.message;
        result.time = ((Date.now() - startTime) / 1000).toFixed(2);
    }
    
    return result;
});
