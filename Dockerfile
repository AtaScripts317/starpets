FROM python:3.11-slim

# Python proxy için
WORKDIR /proxy
COPY proxy/proxy_server.py .
RUN pip install aiohttp

# Node.js cloud code için
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app
COPY cloud/ ./cloud/
COPY public/ ./public/

# Proxy'yi arka planda başlat, cloud code'u çalıştır
CMD ["sh", "-c", "python /proxy/proxy_server.py & node -e \"console.log('Cloud code ready'); setTimeout(()=>{}, 9999999)\""]

EXPOSE 6321 6464 8080
