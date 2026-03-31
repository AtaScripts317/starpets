FROM node:18-alpine

# Nginx kur
RUN apk add --no-cache nginx

# Cloud code
WORKDIR /app
COPY cloud/ ./cloud/

# Public dosyalar - DOĞRU YER
COPY public/ /usr/share/nginx/html

# Nginx config - DÜZELTİLMİŞ
RUN rm -f /etc/nginx/http.d/default.conf
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/http.d/default.conf

# Nginx test
RUN nginx -t

EXPOSE 80

CMD ["sh", "-c", "nginx -g 'daemon off;' & node -e \"console.log('Cloud code ready'); setTimeout(()=>{}, 9999999)\""]
