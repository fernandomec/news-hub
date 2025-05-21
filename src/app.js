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
const rotasAdmin = require('./routes/admin');
app.use('/', rotasIndex);
app.use('/admin', rotasAdmin);

//painel superadmin
app.get('/superadmin', authMiddleware, checkRole(['SUPER_ADMIN']), async (req, res) => {
  res.render('admin/superadmin', { user: res.locals.user });
});

//painel admin
app.get('/admin', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  res.render('admin/admin', { user: res.locals.user });
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
        dataPublicacao: 'desc'
      },
      take: 10
    });
    res.render('home', { user: res.locals.user, noticias: noticias });
  } catch (error) {
    console.error('erro ao buscar notícias:', error);
    res.render('home', { user: res.locals.user, noticias: [] });
  }
});

//rota para exibir notícia individual por slug
app.get('/noticia/:slug', async (req, res) => {
  try {
    const noticia = await prisma.noticia.findUnique({
      where: { slug: req.params.slug },
      include: {
        imagem: true,
        autor: { select: { username: true } },
        categorias: true,
        tags: true,
        comentarios: {
          where: { aprovado: true },
          include: {
            autor: { select: { username: true, imagemPerfilId: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!noticia || !noticia.publicado) {
      return res.status(404).render('404');
    }
    res.render('noticia', { noticia, user: res.locals.user, mensagemComentario: null });
  } catch (error) {
    res.status(404).render('404');
  }
});

//postar comentário em notícia
app.post('/noticia/:slug/comentar', async (req, res) => {
  try {
    if (!res.locals.user) {
      return res.redirect('/login');
    }
    const noticia = await prisma.noticia.findUnique({ where: { slug: req.params.slug } });
    if (!noticia || !noticia.publicado) {
      return res.status(404).render('404');
    }
    const conteudo = req.body.conteudo?.trim();
    if (!conteudo || conteudo.length < 2) {
      //renderiza a notícia novamente com erro
      const noticiaCompleta = await prisma.noticia.findUnique({
        where: { slug: req.params.slug },
        include: {
          imagem: true,
          autor: { select: { username: true } },
          categorias: true,
          tags: true,
          comentarios: {
            where: { aprovado: true },
            include: {
              autor: { select: { username: true, imagemPerfilId: true } }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });
      return res.render('noticia', { noticia: noticiaCompleta, user: res.locals.user, mensagemComentario: 'Comentário muito curto.' });
    }
    await prisma.comentario.create({
      data: {
        conteudo,
        autorId: res.locals.user.id,
        noticiaId: noticia.id,
        aprovado: false //comentário precisa ser aprovado
      }
    });
    //renderiza a notícia novamente com mensagem de sucesso
    const noticiaCompleta = await prisma.noticia.findUnique({
      where: { slug: req.params.slug },
      include: {
        imagem: true,
        autor: { select: { username: true } },
        categorias: true,
        tags: true,
        comentarios: {
          where: { aprovado: true },
          include: {
            autor: { select: { username: true, imagemPerfilId: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    res.render('noticia', { noticia: noticiaCompleta, user: res.locals.user, mensagemComentario: 'Comentário enviado para aprovação.' });
  } catch (error) {
    res.status(404).render('404');
  }
});

//404
app.use((req, res, next) => {
  res.status(404).render('404');
});