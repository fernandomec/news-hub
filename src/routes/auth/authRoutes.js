const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../../middleware/auth');

// Renderiza formulário de login
router.get('/login', (req, res) => {
  if (res.locals.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { erro: null });
});

// Processar login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    
    if (!usuario) {
      return res.render('auth/login', { erro: 'Email ou senha inválidos' });
    }
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    
    if (!senhaValida) {
      return res.render('auth/login', { erro: 'Email ou senha inválidos' });
    }
    
    const token = jwt.sign(
      { id: usuario.id, role: usuario.role }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.cookie('jwt', token, { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    
    res.redirect('/');
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.render('auth/login', { erro: 'Erro ao processar login' });
  }
});

// Renderiza formulário de cadastro
router.get('/cadastro', (req, res) => {
  if (res.locals.user) {
    return res.redirect('/');
  }
  res.render('auth/cadastro', { erro: null });
});

// Processar cadastro
router.post('/cadastro', async (req, res) => {
  const { username, email, senha, confirmarSenha } = req.body;
  
  try {
    // Validações básicas
    if (!username || !email || !senha || !confirmarSenha) {
      return res.render('auth/cadastro', { 
        erro: 'Todos os campos são obrigatórios' 
      });
    }
    
    if (senha !== confirmarSenha) {
      return res.render('auth/cadastro', { 
        erro: 'As senhas não conferem' 
      });
    }
    
    // Verificar se usuário já existe
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.render('auth/cadastro', { 
        erro: 'Email já está em uso' 
      });
    }
    
    // Criptografar senha
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(senha, salt);
    
    // Criar usuário
    const novoUsuario = await prisma.usuario.create({
      data: {
        username,
        email,
        senha: senhaCriptografada,
        role: 'USER'
      }
    });
    
    // Login automático após cadastro
    const token = jwt.sign(
      { id: novoUsuario.id, role: novoUsuario.role }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.cookie('jwt', token, { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    
    res.redirect('/');
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.render('auth/cadastro', { erro: 'Erro ao processar cadastro' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
});

// Perfil do usuário
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: res.locals.user.id },
      include: {
        favoritos: {
          include: {
            noticia: true
          }
        },
        imagemPerfil: true
      }
    });
    
    res.render('auth/perfil', { usuario });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.redirect('/');
  }
});

// Editar perfil
router.post('/perfil/editar', authMiddleware, async (req, res) => {
  const { username, biografia, localizacao, website } = req.body;
  const userId = res.locals.user.id;
  
  try {
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        username,
        biografia,
        localizacao,
        website
      }
    });
    
    res.redirect('/auth/perfil');
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.redirect('/auth/perfil');
  }
});

module.exports = router;
