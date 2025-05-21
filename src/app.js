const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

//express
const app = express();

//prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//middlewares
app.use(express.urlencoded({ extended: true })); //formulários
app.use(express.json()); //json
app.use(express.static(path.join(__dirname, '..', 'public'))); //public
app.use(cookieParser());
const { authMiddleware, checkUser, checkRole } = require('./middleware/auth');
app.use(checkUser);

//middleware para disponibilizar categorias em todas as views
app.use(async (req, res, next) => {
  try {
    const categorias = await prisma.categoria.findMany({
      select: {
        id: true,
        nome: true,
        slug: true
      }
    });
    res.locals.categorias = categorias;
    next();
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.locals.categorias = [];
    next();
  }
});

//rota pra imagens diretamente no banco de dados
app.get('/imagem/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const imagem = await prisma.imagem.findUnique({
      where: { id }
    });
    
    if (!imagem) {
      return res.status(404).send('Imagem não encontrada');
    }
    
    res.setHeader('Content-Type', imagem.tipoMime);
    res.send(imagem.dados);
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).send('Erro ao buscar imagem');
  }
});

//servidor
const PORT = process.env.PORT;

async function main() {
  try {
    app.listen(PORT, () => {
      console.info(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }
}
  
main();

//rotas
const rotasIndex = require('./routes/index');
app.use('/', rotasIndex);

//painel superadmin
app.get('/superadmin', authMiddleware, checkRole(['SUPER_ADMIN']), async (req, res) => {
  res.render('admin/superadmin', { user: res.locals.user });
});

//painel admin
app.get('/admin', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  res.render('admin/admin', { user: res.locals.user });
});

//gerenciar usuários
app.get('/admin/usuarios', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  //busque usuários do banco e envie para a view
  const usuarios = await prisma.usuario.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('admin/usuarios', { user: res.locals.user, usuarios });
});

//gerenciar notícias
app.get('/admin/noticias', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  const noticias = await prisma.noticia.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('admin/noticias', { user: res.locals.user, noticias });
});

//gerenciar comentários
app.get('/admin/comentarios', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  const comentarios = await prisma.comentario.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('admin/comentarios', { user: res.locals.user, comentarios });
});

//gerenciar categorias
app.get('/admin/categorias', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  const categorias = await prisma.categoria.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('admin/categorias', { user: res.locals.user, categorias });
});

//gerenciar tags
app.get('/admin/tags', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('admin/tags', { user: res.locals.user, tags });
});

//home
app.get('/', async (req, res) => {
  try {
    const noticias = await prisma.noticia.findMany({
      where: { publicado: true },
      include: {
        imagem: true,
        autor: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        dataPublicacao: 'desc' //ordenar por data de publicação
      },
      take: 10 //pegar as 10 mais recentes
    });
    res.render('home', { user: res.locals.user, noticias: noticias });
  } catch (error) {
    console.error('erro ao buscar notícias:', error);
    res.render('home', { user: res.locals.user, noticias: [] });
  }
});

//404
app.use((req, res, next) => {
  res.status(404).render('404');
});