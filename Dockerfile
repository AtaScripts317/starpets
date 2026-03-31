FROM node:18-alpine

# Nginx kur
RUN apk add --no-cache nginx

# Cloud code
WORKDIR /app
COPY cloud/ ./cloud/

# Public dosyalar
COPY public/ /usr/share/nginx/html

# Nginx config - DÜZELTİLMİŞ (root doğru)
COPY nginx.conf /etc/nginx/http.d/default.conf

# Nginx test
RUN nginx -t

EXPOSE 80

CMD ["sh", "-c", "nginx -g 'daemon off;' & node -e \"console.log('Cloud code ready'); setTimeout(()=>{}, 9999999)\""]
