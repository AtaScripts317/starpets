FROM python:3.11-slim

# Python proxy için
WORKDIR /proxy
COPY proxy/proxy_server.py .
RUN pip install aiohttp

# Nginx ve Node.js kur
RUN apt-get update && apt-get install -y curl nginx
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Cloud code ve public dosyaları
WORKDIR /app
COPY cloud/ ./cloud/
COPY public/ ./public/

# Nginx yapılandırması - public dosyaları göster
RUN rm /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Tüm servisleri başlat
CMD ["sh", "-c", "nginx -g 'daemon off;' & python /proxy/proxy_server.py & node -e \"console.log('Cloud code ready'); setTimeout(()=>{}, 9999999)\""]

EXPOSE 80 6321 6464 8080
