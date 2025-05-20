const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Express
const app = express();

// Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true })); // formulários
app.use(express.json()); // JSON
app.use(express.static(path.join(__dirname, '..', 'public'))); // public
app.use(cookieParser());
const { authMiddleware, checkUser } = require('./middleware/auth');
app.use(checkUser);

// Middleware para disponibilizar categorias em todas as views
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

// Rota para servir imagens diretamente do banco de dados
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

// Servidor
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
app.use('/', rotasIndex);

//home
app.get('/', async (req, res) => {
  try {
    const empresas = await prisma.empresa.findMany({
      include: {
        bannerImagem: true, //inclui os dados da imagem do banner
      },
    });
    res.render('home', { user: res.locals.user, empresas: empresas });
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.render('home', { user: res.locals.user, empresas: [] });
  }
});

//sobre
app.get('/about', (req, res) => {
  res.render('about', { user: res.locals.user });
});

//contato
app.get('/contact', (req, res) => {
  res.render('contact', { user: res.locals.user });
});

//404
app.use((req, res, next) => {
  res.status(404).render('404');
});