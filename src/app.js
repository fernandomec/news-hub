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
app.use(express.urlencoded({ extended: true })); // formulários
app.use(express.json()); // JSON
app.use(express.static(path.join(__dirname, '..', 'public'))); // public
app.use(cookieParser());
const { authMiddleware, checkUser } = require('./middleware/auth');
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

// Importando rotas principais
const rotasIndex = require('./routes/index');

// Aplicando rotas
app.use('/', rotasIndex); //agora /login, /register, etc., serão tratadas por rotasIndex

//home
app.get('/', async (req, res) => {
  try {
    //alterado de 'empresa' para 'noticia' para alinhar com o schema
    const noticias = await prisma.noticia.findMany({
      where: { publicado: true }, //exemplo: buscar apenas notícias publicadas
      include: {
        imagem: true, //inclui os dados da imagem da notícia (se houver relação 'imagem' em 'Noticia')
        autor: { //exemplo: incluir nome do autor
          select: {
            username: true
          }
        }
      },
      orderBy: {
        dataPublicacao: 'desc' //exemplo: ordenar por data de publicação
      },
      take: 10 //exemplo: pegar as 10 mais recentes
    });
    //a view 'home.ejs' precisará ser atualizada para usar 'noticias' em vez de 'empresas'
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