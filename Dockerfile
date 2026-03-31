FROM node:18-alpine

# PowerShell Core (pwsh) kur
RUN apk add --no-cache \
    curl \
    ca-certificates \
    && curl -L https://github.com/PowerShell/PowerShell/releases/download/v7.4.0/powershell-7.4.0-linux-alpine-x64.tar.gz -o /tmp/powershell.tar.gz \
    && mkdir -p /opt/microsoft/powershell/7 \
    && tar zxf /tmp/powershell.tar.gz -C /opt/microsoft/powershell/7 \
    && chmod +x /opt/microsoft/powershell/7/pwsh \
    && ln -s /opt/microsoft/powershell/7/pwsh /usr/bin/pwsh \
    && rm /tmp/powershell.tar.gz

# Cloud code
WORKDIR /app
COPY cloud/ ./cloud/

# Nginx kur
RUN apk add --no-cache nginx
COPY public/ /usr/share/nginx/html

# Nginx config
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ =404; } }' > /etc/nginx/http.d/default.conf

EXPOSE 80

CMD ["sh", "-c", "nginx -g 'daemon off;' & node -e \"console.log('Cloud code ready'); setTimeout(()=>{}, 9999999)\""]
