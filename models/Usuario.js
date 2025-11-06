const bcrypt = require('bcrypt');
const db = require('../config/database');

class Usuario {
  static async criar(dados) {
    const { nome, email, senha, perfil = 'servidor', matricula, telefone, cargo, observacoes } = dados;
    
    const senhaHash = await bcrypt.hash(senha, 10);
    
    const [id] = await db('usuarios')
      .insert({
        nome: nome.toUpperCase(),
        email: email.toLowerCase(),
        senha_hash: senhaHash,
        perfil,
        matricula: matricula || null,
        telefone: telefone || null,
        cargo: cargo || null,
        observacoes: observacoes || null
      });
    
    const usuario = await db('usuarios').where('id', id).first();
    return usuario;
  }

  static async buscarPorEmail(email) {
    return await db('usuarios')
      .where('email', email.toLowerCase())
      .first();
  }

  static async buscarPorId(id) {
    return await db('usuarios')
      .where('id', id)
      .first();
  }

  static async verificarSenha(senha, hash) {
    return await bcrypt.compare(senha, hash);
  }

  static async listar() {
    return await db('usuarios')
      .select('id', 'nome', 'email', 'perfil', 'matricula', 'telefone', 'cargo', 'observacoes', 'created_at')
      .orderBy('nome');
  }

  static async atualizar(id, dados) {
    const updateData = { ...dados };
    
    if (updateData.nome) {
      updateData.nome = updateData.nome.toUpperCase();
    }
    
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }
    
    if (updateData.senha) {
      updateData.senha_hash = await bcrypt.hash(updateData.senha, 10);
      delete updateData.senha;
    }
    
    await db('usuarios')
      .where('id', id)
      .update(updateData);
    
    const usuario = await db('usuarios').where('id', id).first();
    return usuario;
  }

  static async excluir(id) {
    return await db('usuarios')
      .where('id', id)
      .del();
  }
}

module.exports = Usuario;
