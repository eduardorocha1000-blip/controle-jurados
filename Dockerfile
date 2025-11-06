# Dockerfile para Sistema de Controle de Jurados

FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p database uploads logs backups

# Configurar permissões
RUN chown -R node:node /app

# Mudar para usuário não-root
USER node

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
