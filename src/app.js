const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

//inicializa o express
const app = express();

//prisma client para acesso ao banco de dados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//configuração do EJS como template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//middlewares
app.use(express.urlencoded({ extended: true })); //permite receber dados de formulários
app.use(express.json()); //permite receber dados em JSON
app.use(express.static(path.join(__dirname, '..', 'public'))); //arquivos estaticos da pasta public
app.use(cookieParser()); //cookies
const { authMiddleware, checkUser, checkRole } = require('./middleware/auth');
app.use(checkUser); //verifica usuário logado em todas as rotas

//porta do servidor
const PORT = process.env.PORT;

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
    res.locals.categorias = categorias; //disponibiliza categorias para as views
    next();
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.locals.categorias = [];
    next();
  }
});

//rota para buscar imagens salvas no banco de dados
app.get('/imagem/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const imagem = await prisma.imagem.findUnique({
      where: { id }
    });
    
    if (!imagem) {
      return res.status(404).send('Imagem não encontrada');
    }
    
    res.setHeader('Content-Type', imagem.tipoMime); //define o tipo da imagem
    res.send(imagem.dados); //envia os dados da imagem
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).send('Erro ao buscar imagem');
  }
});


//função principal para iniciar o servidor
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

//importa e usa as rotas principais e administrativas
const rotasIndex = require('./routes/index');
const rotasAdmin = require('./routes/admin');
app.use('/', rotasIndex);
app.use('/admin', rotasAdmin);

//rota da página inicial, exibe as últimas notícias publicadas
app.get('/', async (req, res) => {
  try {
    const noticias = await prisma.noticia.findMany({
      where: { publicado: true },
      include: {
        imagem: true,
        autor: { select: { username: true } },
        categoria: true,
        tags: true
      },
      orderBy: { dataPublicacao: 'desc' },
      take: 10
    });
    res.render('home', { user: res.locals.user, noticias });
  } catch (error) {
    console.error('erro ao buscar notícias:', error);
    res.render('home', { user: res.locals.user, noticias: [] });
  }
});

// rota: notícias em alta (exemplo: mais visualizadas)
app.get('/em-alta', async (req, res) => {
  try {
    const noticiasEmAlta = await prisma.noticia.findMany({
      where: { publicado: true },
      include: {
        categoria: true
      },
      orderBy: { visualizacoes: 'desc' },
      take: 10
    });
    res.render('em-alta', { user: res.locals.user, noticiasEmAlta });
  } catch (error) {
    res.render('em-alta', { user: res.locals.user, noticiasEmAlta: [] });
  }
});

// rota: notícias mais lidas (exemplo: mais visualizadas do dia)
app.get('/mais-lidas', async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const noticiasMaisLidas = await prisma.noticia.findMany({
      where: {
        publicado: true,
        dataPublicacao: { gte: hoje }
      },
      include: {
        categoria: true
      },
      orderBy: { visualizacoes: 'desc' },
      take: 10
    });
    res.render('mais-lidas', { user: res.locals.user, noticiasMaisLidas });
  } catch (error) {
    res.render('mais-lidas', { user: res.locals.user, noticiasMaisLidas: [] });
  }
});

// rota: listar notícias por categoria
app.get('/noticias/categoria/:categoria', async (req, res) => {
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { slug: req.params.categoria }
    });
    if (!categoria) {
      return res.status(404).render('404');
    }
    const noticias = await prisma.noticia.findMany({
      where: {
        publicado: true,
        categoriaId: categoria.id
      },
      include: {
        imagem: true,
        autor: { select: { username: true } },
        categoria: true,
        tags: true
      },
      orderBy: { dataPublicacao: 'desc' }
    });
    res.render('noticias-busca', { user: res.locals.user, termoBusca: categoria.nome, noticias });
  } catch (error) {
    res.render('noticias-busca', { user: res.locals.user, termoBusca: '', noticias: [] });
  }
});

// rota: exibir notícia individual pelo padrão correto
app.get('/noticias/categoria/:categoria/:ano/:mes/:dia/:slug', async (req, res) => {
  try {
    const { categoria, ano, mes, dia, slug } = req.params;
    const noticia = await prisma.noticia.findFirst({
      where: {
        slug,
        publicado: true,
        categoria: { slug: categoria }
      },
      include: {
        imagem: true,
        autor: { select: { username: true } },
        categoria: true,
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
    if (!noticia) {
      return res.status(404).render('404');
    }
    res.render('noticia', { noticia, user: res.locals.user, mensagemComentario: null });
  } catch (error) {
    res.status(404).render('404');
  }
});

//rota de busca de notícias pelo termo informado
app.get('/noticias/busca', async (req, res) => {
  const termoBusca = req.query.q ? req.query.q.trim() : '';
  if (!termoBusca) {
    return res.render('noticias-busca', { user: res.locals.user, termoBusca, noticias: [] });
  }
  try {
    const noticias = await prisma.noticia.findMany({
      where: {
        publicado: true,
        OR: [
          { titulo: { contains: termoBusca, mode: 'insensitive' } },
          { resumo: { contains: termoBusca, mode: 'insensitive' } },
          { conteudo: { contains: termoBusca, mode: 'insensitive' } }
        ]
      },
      include: {
        imagem: true,
        autor: { select: { username: true } },
        categoria: true,
        tags: true
      },
      orderBy: { dataPublicacao: 'desc' }
    });
    res.render('noticias-busca', { user: res.locals.user, termoBusca, noticias });
  } catch (error) {
    res.render('noticias-busca', { user: res.locals.user, termoBusca, noticias: [] });
  }
});

//rota para painel do superadmin (acesso restrito)
app.get('/superadmin', authMiddleware, checkRole(['SUPER_ADMIN']), async (req, res) => {
  res.render('admin/superadmin', { user: res.locals.user });
});

//rota para painel do admin (acesso restrito)
app.get('/admin', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  res.render('admin/admin', { user: res.locals.user });
});

//rota para postar comentário em uma noticia
app.post('/noticias/categoria/:categoria/:ano/:mes/:dia/:slug/comentar', async (req, res) => {
  try {
    if (!res.locals.user) {
      return res.redirect('/login'); //redireciona se não estiver logado
    }
    const { categoria, slug } = req.params;
    const noticia = await prisma.noticia.findFirst({
      where: {
        slug,
        publicado: true,
        categoria: { slug: categoria }
      }
    });
    if (!noticia) {
      return res.status(404).render('404');
    }
    const conteudo = req.body.conteudo?.trim();
    if (!conteudo || conteudo.length < 2) {
      // renderiza a notícia novamente com erro
      const noticiaCompleta = await prisma.noticia.findUnique({
        where: { slug },
        include: {
          imagem: true,
          autor: { select: { username: true } },
          categoria: true,
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
        aprovado: false //comentário precisa ser aprovado pelo admin
      }
    });
    // renderiza a notícia novamente com mensagem de sucesso
    const noticiaCompleta = await prisma.noticia.findUnique({
      where: { slug },
      include: {
        imagem: true,
        autor: { select: { username: true } },
        categoria: true,
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