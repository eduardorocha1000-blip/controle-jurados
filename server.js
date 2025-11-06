require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const knex = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'indicacao-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF são permitidos!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Criar diretório uploads se não existir
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware para servir arquivos estáticos
app.use('/uploads', express.static(uploadsDir));

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.datatables.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.datatables.net"],
      scriptSrcAttr: ["'unsafe-inline'"], // Permitir onclick inline
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));

// Rate limiting - Configuração mais permissiva para desenvolvimento
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests em desenvolvimento, 100 em produção
  message: 'Muitas tentativas de acesso. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'sua_chave_secreta_aqui',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Configuração de flash messages
app.use(flash());

// Method override para PUT e DELETE
app.use(methodOverride('_method'));

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração de views
app.set('view engine', 'ejs');

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Compat: servir logo-tjsc.png redirecionando para a melhor imagem disponível (png/jpg/webp)
app.get(['/images/logo-tjsc.png','/public/images/logo-tjsc.png'], (req, res, next) => {
  try {
    const candidates = [
      path.join(__dirname, 'public', 'images', 'logo-tjsc.png'),
      path.join(__dirname, 'public', 'images', 'logo-tjsc.jpg'),
      path.join(__dirname, 'public', 'images', 'logo-tjsc.jpeg'),
      path.join(__dirname, 'public', 'images', 'logo-tjsc.webp')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return res.sendFile(p);
    }
  } catch (_) {}
  return res.status(404).end();
});

// Favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// Middleware para dados globais
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.messages = req.flash();
  next();
});

// Middleware de autenticação
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Rotas
app.use('/login', require('./routes/auth'));
app.use('/perfil', requireAuth, require('./routes/perfil'));
app.use('/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/juizes', requireAuth, require('./routes/juizes'));
app.use('/instituicoes', requireAuth, require('./routes/instituicoes'));
app.use('/jurados', requireAuth, require('./routes/jurados'));
app.use('/indicacoes', requireAuth, require('./routes/indicacoes'));
app.use('/sorteios', requireAuth, require('./routes/sorteios'));
app.use('/cedulas', requireAuth, require('./routes/cedulas'));
app.use('/editais', requireAuth, require('./routes/editais'));
app.use('/emails', requireAuth, require('./routes/emails'));
app.use('/relatorios', requireAuth, require('./routes/relatorios'));
app.use('/backup', requireAuth, require('./routes/backup'));
app.use('/usuarios', requireAuth, require('./routes/usuarios'));
app.use('/ultimo-conselho', requireAuth, require('./routes/ultimo-conselho'));
app.use('/api', require('./routes/api'));

// Rota raiz
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Rota para limpar cache do rate limiting (apenas desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.get('/clear-rate-limit', (req, res) => {
    // Limpar cache do rate limiting
    limiter.resetKey(req.ip);
    res.json({ 
      success: true, 
      message: 'Rate limit cache cleared for IP: ' + req.ip,
      timestamp: new Date().toISOString()
    });
  });
}

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Erro Interno',
    message: 'Ocorreu um erro interno do servidor.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página Não Encontrada',
    message: 'A página solicitada não foi encontrada.',
    error: {}
  });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log('Debug: Servidor iniciado com sucesso!');
});

module.exports = app;
