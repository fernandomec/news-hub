const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importando todas as rotas
const authRoutes = require('./auth/authRoutes');
const noticiasRoutes = require('./noticias/noticiasRoutes');
const comentarioRoutes = require('./comentario/comentarioRoutes');
const adminRoutes = require('./admin/adminRoutes');

// Registrando as rotas
router.use('/auth', authRoutes);
router.use('/noticias', noticiasRoutes);
router.use('/comentarios', comentarioRoutes);
router.use('/admin', adminRoutes);

// Rota principal - home
router.get('/', async (req, res) => {
  try {
    // Notícias em destaque (mais recentes publicadas)
    const destaques = await prisma.noticia.findMany({
      where: {
        publicado: true
      },
      include: {
        autor: {
          select: {
            username: true
          }
        },
        categorias: true,
        imagem: true
      },
      orderBy: {
        dataPublicacao: 'desc'
      },
      take: 5
    });
    
    // Notícias mais lidas
    const maisLidas = await prisma.noticia.findMany({
      where: {
        publicado: true
      },
      include: {
        imagem: true
      },
      orderBy: {
        visualizacoes: 'desc'
      },
      take: 5
    });
    
    // Notícias por categoria principal
    const categorias = await prisma.categoria.findMany({
      include: {
        noticias: {
          where: {
            publicado: true
          },
          include: {
            imagem: true
          },
          orderBy: {
            dataPublicacao: 'desc'
          },
          take: 3
        },
        imagem: true
      },
      take: 4
    });
    
    res.render('home', {
      destaques,
      maisLidas,
      categorias,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao carregar página inicial:', error);
    res.status(500).render('error', { mensagem: 'Erro ao carregar conteúdo' });
  }
});

// Rota de busca
router.get('/busca', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.redirect('/');
  }
  
  try {
    const resultados = await prisma.noticia.findMany({
      where: {
        publicado: true,
        OR: [
          { titulo: { contains: q, mode: 'insensitive' } },
          { conteudo: { contains: q, mode: 'insensitive' } },
          { resumo: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        imagem: true,
        autor: {
          select: {
            username: true
          }
        },
        categorias: true
      },
      orderBy: {
        dataPublicacao: 'desc'
      },
      take: 20
    });
    
    res.render('busca', {
      q,
      resultados,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao realizar busca:', error);
    res.status(500).render('error', { mensagem: 'Erro ao realizar busca' });
  }
});

// Página sobre o portal
router.get('/sobre', (req, res) => {
  res.render('sobre', { user: res.locals.user });
});

// Página de contato
router.get('/contato', (req, res) => {
  res.render('contato', { user: res.locals.user });
});

// Rota 404 para qualquer outra URL
router.use((req, res) => {
  res.status(404).render('404');
});

module.exports = router;