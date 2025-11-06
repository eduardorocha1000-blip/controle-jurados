const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const multer = require('multer');
const db = require('../config/database');
const router = express.Router();
// Configuração de upload local para restauração (upload de .zip/.sql)
const uploadDir = path.join(__dirname, '../backups/tmp');
const ensureUploadDir = async () => { try { await fs.mkdir(uploadDir, { recursive: true }); } catch (_) {} };
const upload = multer({
  storage: multer.diskStorage({
    destination: async function(req, file, cb) {
      await ensureUploadDir();
      cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  fileFilter: function(req, file, cb) {
    const allowed = ['.zip', '.sql'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Formato inválido. Envie um arquivo .zip ou .sql'));
    cb(null, true);
  },
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// Página principal de backup
router.get('/', async (req, res) => {
  try {
    // Buscar estatísticas
    const stats = await getBackupStats();
    
    // Buscar configurações
    const config = await getBackupConfig();
    
    // Buscar lista de backups
    const backups = await listBackups();
    
    res.render('backup/index', {
      title: 'Backup - Controle de Jurados',
      stats,
      config,
      backups,
      ultimoBackup: stats.ultimoBackup,
      tamanhoTotal: stats.tamanhoTotal
    });
  } catch (error) {
    console.error('Erro ao carregar página de backup:', error);
    res.render('error', {
      title: 'Erro',
      message: 'Erro ao carregar página de backup',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Criar backup
router.post('/criar', async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    // Checkboxes vêm como 'on' quando marcados
    const incluirArquivos = req.body.incluir_arquivos === 'true' || req.body.incluir_arquivos === 'on';
    const comprimir = req.body.comprimir === 'true' || req.body.comprimir === 'on';
    
    const backupId = Date.now();
    const backupName = nome || `Backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
    const fileName = `${backupName}_${backupId}`;
    
    // Criar diretório de backup se não existir
    const backupDir = path.join(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    let backupPath;
    if (comprimir) {
      backupPath = path.join(backupDir, `${fileName}.zip`);
      await createZipBackup(backupPath, incluirArquivos);
    } else {
      backupPath = path.join(backupDir, `${fileName}.sql`);
      await createSqlBackup(backupPath);
    }
    
    // Registrar backup no banco
    await registerBackup({
      nome: backupName,
      descricao: descricao || '',
      arquivo: path.basename(backupPath),
      tamanho: await getFileSize(backupPath),
      tipo: comprimir ? 'Comprimido' : 'SQL',
      status: 'Concluído'
    });
    
    req.flash = req.flash || {};
    req.flash.success = 'Backup criado com sucesso!';
    res.redirect('/backup');
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    req.flash = req.flash || {};
    req.flash.error = 'Erro ao criar backup: ' + error.message;
    res.redirect('/backup');
  }
});

// Baixar backup por nome de arquivo
router.get('/baixar/:arquivo', async (req, res) => {
  try {
    // Sanitização: aceitar apenas o basename
    const arquivo = path.basename(req.params.arquivo);
    const backupPath = path.join(__dirname, '../backups', arquivo);
    
    // Verificar se arquivo existe
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado' });
    }
    
    res.download(backupPath, arquivo);
  } catch (error) {
    console.error('Erro ao baixar backup:', error);
    res.status(500).json({ error: 'Erro ao baixar backup' });
  }
});

// Restaurar backup por nome de arquivo
router.post('/restaurar/:arquivo', async (req, res) => {
  try {
    const { backup_antes } = req.body;
    
    // Fazer backup antes de restaurar se solicitado
    if (backup_antes === 'true') {
      await createAutomaticBackup('Backup antes da restauração');
    }
    
    const arquivo = path.basename(req.params.arquivo);
    const backupPath = path.join(__dirname, '../backups', arquivo);
    
    // Verificar se arquivo existe
    try {
      await fs.access(backupPath);
    } catch {
      return res.json({ success: false, message: 'Arquivo de backup não encontrado' });
    }
    
    // Restaurar backup
    if (arquivo.endsWith('.zip')) {
      await restoreZipBackup(backupPath);
    } else {
      await restoreSqlBackup(backupPath);
    }

    req.flash = req.flash || function() { return {}; };
    req.flash('success', 'Backup restaurado com sucesso!');
    return res.redirect('/backup');
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    req.flash = req.flash || function() { return {}; };
    req.flash('error', 'Erro ao restaurar backup: ' + error.message);
    return res.redirect('/backup');
  }
});

// Restaurar backup por upload
router.post('/restaurar', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash = req.flash || function() { return {}; };
      req.flash('error', 'Nenhum arquivo enviado');
      return res.redirect('/backup');
    }

    // Mover arquivo do tmp para a pasta de backups com o nome original
    const backupsDir = path.join(__dirname, '../backups');
    try { await fs.mkdir(backupsDir, { recursive: true }); } catch (_) {}
    const destino = path.join(backupsDir, req.file.originalname);
    await fs.rename(req.file.path, destino);

    // Restaurar conforme a extensão
    if (req.file.originalname.toLowerCase().endsWith('.zip')) {
      await restoreZipBackup(destino);
    } else if (req.file.originalname.toLowerCase().endsWith('.sql')) {
      await restoreSqlBackup(destino);
    }

    req.flash = req.flash || function() { return {}; };
    req.flash('success', 'Backup restaurado com sucesso!');
    return res.redirect('/backup');
  } catch (error) {
    console.error('Erro ao restaurar backup (upload):', error);
    req.flash = req.flash || function() { return {}; };
    req.flash('error', 'Erro ao restaurar backup: ' + error.message);
    return res.redirect('/backup');
  }
});

// Detalhes do backup (exibe metadados do arquivo)
router.get('/detalhes/:arquivo', async (req, res) => {
  try {
    const arquivo = path.basename(req.params.arquivo);
    const backupPath = path.join(__dirname, '../backups', arquivo);

    // Verificar se arquivo existe
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).render('error', {
        title: 'Arquivo não encontrado',
        message: 'Arquivo de backup não encontrado.',
        error: {}
      });
    }

    const stats = await require('fs').promises.stat(backupPath);
    const detalhes = {
      arquivo,
      caminho: backupPath,
      tamanhoBytes: stats.size,
      tamanho: formatFileSize(stats.size),
      criadoEm: stats.birthtime,
      modificadoEm: stats.mtime,
      tipo: arquivo.endsWith('.zip') ? 'Comprimido' : (arquivo.endsWith('.sql') ? 'SQL' : 'Outro')
    };

    res.render('backup/detalhes', {
      title: 'Detalhes do Backup - Controle de Jurados',
      detalhes
    });
  } catch (error) {
    console.error('Erro ao carregar detalhes do backup:', error);
    res.status(500).render('error', {
      title: 'Erro',
      message: 'Erro ao carregar detalhes do backup',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Excluir backup por nome de arquivo
router.delete('/:arquivo', async (req, res) => {
  try {
    const arquivo = path.basename(req.params.arquivo);
    const backupPath = path.join(__dirname, '../backups', arquivo);
    try {
      await fs.unlink(backupPath);
    } catch (error) {
      console.warn('Arquivo de backup não encontrado:', backupPath);
    }
    
    res.json({ success: true, message: 'Backup excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir backup:', error);
    res.json({ success: false, message: 'Erro ao excluir backup: ' + error.message });
  }
});

// Salvar configurações
router.post('/configuracoes', async (req, res) => {
  try {
    const config = {
      backup_automatico: req.body.backup_automatico === 'true' || req.body.backup_automatico === true,
      manter_backups: req.body.manter_backups === 'true' || req.body.manter_backups === true,
      notificar_backup: req.body.notificar_backup === 'true' || req.body.notificar_backup === true,
      comprimir_automatico: req.body.comprimir_automatico === 'true' || req.body.comprimir_automatico === true
    };
    
    await saveBackupConfig(config);
    
    req.flash = req.flash || function() { return {}; };
    req.flash('success', 'Configurações salvas com sucesso!');
    return res.redirect('/backup');
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    req.flash = req.flash || function() { return {}; };
    req.flash('error', 'Erro ao salvar configurações: ' + error.message);
    return res.redirect('/backup');
  }
});

// Funções auxiliares
async function getBackupStats() {
  try {
    const backups = await listBackups();
    const totalBackups = backups.length;
    const ultimoBackup = backups.length > 0 ? backups[0].created_at : null;
    
    let tamanhoTotalBytes = 0;
    for (const backup of backups) {
      // Somar com base em bytes numéricos
      if (typeof backup.tamanho_bytes === 'number') {
        tamanhoTotalBytes += backup.tamanho_bytes;
      }
    }
    
    return {
      totalBackups,
      ultimoBackup,
      tamanhoTotal: formatFileSize(tamanhoTotalBytes)
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalBackups: 0,
      ultimoBackup: null,
      tamanhoTotal: '0 MB'
    };
  }
}

async function getBackupConfig() {
  try {
    // Verificar se a tabela configuracoes existe
    const hasTable = await db.schema.hasTable('configuracoes');
    if (!hasTable) {
      return getDefaultConfig();
    }

    // Buscar configurações do banco
    const configs = await db('configuracoes')
      .whereIn('chave', ['backup_automatico', 'manter_backups', 'notificar_backup', 'comprimir_automatico'])
      .select('chave', 'valor');

    const config = getDefaultConfig();
    
    for (const row of configs) {
      const key = row.chave;
      if (config.hasOwnProperty(key)) {
        // Converter string para boolean
        config[key] = row.valor === 'true' || row.valor === '1' || row.valor === 1;
      }
    }

    return config;
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    backup_automatico: false,
    manter_backups: true,
    notificar_backup: true,
    comprimir_automatico: true
  };
}

async function listBackups() {
  try {
    const backupDir = path.join(__dirname, '../backups');
    const files = await fs.readdir(backupDir);
    
    const backups = [];
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      // Ignorar diretórios e arquivos sem as extensões suportadas
      const isFile = stats.isFile && stats.isFile();
      const isSupported = file.toLowerCase().endsWith('.zip') || file.toLowerCase().endsWith('.sql');
      if (!isFile || !isSupported) continue;

      backups.push({
        nome: file.replace(/\.(zip|sql)$/i, ''),
        arquivo: file,
        tamanho: formatFileSize(stats.size),
        tamanho_bytes: stats.size,
        tipo: file.toLowerCase().endsWith('.zip') ? 'Comprimido' : 'SQL',
        status: 'Concluído',
        created_at: stats.birthtime
      });
    }
    
    return backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    return [];
  }
}

async function createZipBackup(filePath, incluirArquivos) {
  return new Promise((resolve, reject) => {
    const output = require('fs').createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    
    archive.pipe(output);
    
    // Adicionar banco de dados (SQLite)
    const sqlitePath = path.join(__dirname, '../database/controle_jurados.db');
    if (require('fs').existsSync(sqlitePath)) {
      archive.file(sqlitePath, { name: 'database/controle_jurados.db' });
    }
    
    // Adicionar arquivos se solicitado
    if (incluirArquivos) {
      const uploadsPath = path.join(__dirname, '../uploads');
      if (require('fs').existsSync(uploadsPath)) {
        archive.directory(uploadsPath, 'uploads');
      }
    }
    
    archive.finalize();
  });
}

async function createSqlBackup(filePath) {
  // Fallback simples: incluir instruções mínimas e indicar caminho do .db
  const sqliteRelative = 'database/controle_jurados.db';
  const content = [
    '-- Backup SQL gerado (placeholder)\n',
    `-- O arquivo SQLite correspondente: ${sqliteRelative}\n`,
    '-- Para backup completo, utilize a opção Comprimir para incluir o arquivo .db.\n'
  ].join('\n');
  await fs.writeFile(filePath, content);
}

async function restoreZipBackup(filePath) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(filePath);

  // Restaurar banco de dados SQLite
  const dbEntry = zip.getEntry('database/controle_jurados.db') || zip.getEntry('controle_jurados.db');
  if (dbEntry) {
    const targetDbPath = path.join(__dirname, '../database/controle_jurados.db');
    try { await fs.mkdir(path.dirname(targetDbPath), { recursive: true }); } catch (_) {}
    await fs.writeFile(targetDbPath, dbEntry.getData());
  }

  // Restaurar uploads (se existirem no zip)
  const uploadsTarget = path.join(__dirname, '../uploads');
  try { await fs.mkdir(uploadsTarget, { recursive: true }); } catch (_) {}
  const entries = zip.getEntries();
  for (const e of entries) {
    if (e.entryName.startsWith('uploads/') && !e.isDirectory) {
      const outPath = path.join(__dirname, '../', e.entryName);
      try { await fs.mkdir(path.dirname(outPath), { recursive: true }); } catch (_) {}
      await fs.writeFile(outPath, e.getData());
    }
  }
}

async function restoreSqlBackup(filePath) {
  // Não suportado no momento (dump SQL não implementado)
  throw new Error('Restauração via SQL não suportada. Utilize um arquivo ZIP gerado pelo sistema.');
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function registerBackup(data) {
  // Implementar registro no banco de dados
  console.log('Registrando backup:', data);
}

async function getBackupById(id) {
  // Implementar busca por ID
  return { id, arquivo: 'backup.zip', nome: 'Backup Teste' };
}

async function deleteBackup(id) {
  // Implementar exclusão do banco
  console.log('Excluindo backup:', id);
}

async function saveBackupConfig(config) {
  try {
    // Criar tabela se não existir (tentativa com tratamento de erro)
    try {
      await db('configuracoes').limit(1);
    } catch (tableError) {
      // Tabela não existe, criar
      if (tableError.message && tableError.message.includes('no such table')) {
        await db.schema.createTable('configuracoes', (table) => {
          table.increments('id').primary();
          table.string('chave').notNullable().unique();
          table.text('valor').notNullable();
          table.timestamp('atualizado_em').defaultTo(db.fn.now());
        });
      } else {
        throw tableError;
      }
    }

    // Salvar cada configuração (usar insertOrUpdate)
    for (const [key, value] of Object.entries(config)) {
      const valorStr = String(value === true || value === 'true' || value === 1 || value === '1');
      
      // Verificar se a configuração já existe
      const existing = await db('configuracoes').where('chave', key).first();
      
      if (existing) {
        // Atualizar
        await db('configuracoes')
          .where('chave', key)
          .update({
            valor: valorStr,
            atualizado_em: db.fn.now()
          });
      } else {
        // Inserir
        await db('configuracoes').insert({
          chave: key,
          valor: valorStr,
          atualizado_em: db.fn.now()
        });
      }
    }
  } catch (error) {
    console.error('Erro ao salvar configurações no banco:', error);
    throw error;
  }
}

async function createAutomaticBackup(descricao) {
  // Implementar backup automático
  console.log('Criando backup automático:', descricao);
}

module.exports = router;