const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../../middleware/auth');

// Listar todas as notícias (com paginação)
router.get('/', async (req, res) => {
  const pagina = parseInt(req.query.pagina) || 1;
  const porPagina = 10;
  const skip = (pagina - 1) * porPagina;
  
  try {
    const noticias = await prisma.noticia.findMany({
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
        tags: true,
        imagem: true
      },
      orderBy: {
        dataPublicacao: 'desc'
      },
      skip,
      take: porPagina
    });
    
    const total = await prisma.noticia.count({
      where: {
        publicado: true
      }
    });
    
    const paginasTotal = Math.ceil(total / porPagina);
    
    res.render('noticias/lista', {
      noticias,
      paginaAtual: pagina,
      paginasTotal,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao listar notícias:', error);
    res.status(500).render('error', { mensagem: 'Erro ao carregar notícias' });
  }
});

// Ver notícia específica
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  
  try {
    const noticia = await prisma.noticia.findUnique({
      where: { slug },
      include: {
        autor: {
          select: {
            id: true,
            username: true,
            imagemPerfil: true
          }
        },
        categorias: true,
        tags: true,
        imagem: true,
        comentarios: {
          where: {
            aprovado: true,
            comentarioPaiId: null
          },
          include: {
            autor: {
              select: {
                username: true,
                imagemPerfil: true
              }
            },
            respostas: {
              where: {
                aprovado: true
              },
              include: {
                autor: {
                  select: {
                    username: true,
                    imagemPerfil: true
                  }
                }
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!noticia || (!noticia.publicado && (!res.locals.user || (noticia.autorId !== res.locals.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(res.locals.user?.role))))) {
      return res.status(404).render('404');
    }
    
    // Registrar visualização
    await prisma.noticia.update({
      where: { id: noticia.id },
      data: { visualizacoes: { increment: 1 } }
    });
    
    // Registrar acesso
    await prisma.acessoNoticia.create({
      data: {
        noticiaId: noticia.id,
        usuarioId: res.locals.user?.id || null,
        ip: req.ip
      }
    });
    
    // Verificar se está nos favoritos do usuário
    let favorito = false;
    if (res.locals.user) {
      const favoritoExistente = await prisma.favorito.findFirst({
        where: {
          usuarioId: res.locals.user.id,
          noticiaId: noticia.id
        }
      });
      favorito = !!favoritoExistente;
    }
    
    // Buscar notícias relacionadas (mesmas categorias)
    const noticiasRelacionadas = await prisma.noticia.findMany({
      where: {
        publicado: true,
        id: { not: noticia.id },
        categorias: {
          some: {
            id: { in: noticia.categorias.map(c => c.id) }
          }
        }
      },
      include: {
        imagem: true,
        autor: {
          select: {
            username: true
          }
        }
      },
      take: 3
    });
    
    res.render('noticias/ver', {
      noticia,
      favorito,
      noticiasRelacionadas,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao buscar notícia:', error);
    res.status(500).render('error', { mensagem: 'Erro ao carregar notícia' });
  }
});

// Filtrar notícias por categoria
router.get('/categoria/:slug', async (req, res) => {
  const { slug } = req.params;
  const pagina = parseInt(req.query.pagina) || 1;
  const porPagina = 10;
  const skip = (pagina - 1) * porPagina;
  
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { slug },
      include: { imagem: true }
    });
    
    if (!categoria) {
      return res.status(404).render('404');
    }
    
    const noticias = await prisma.noticia.findMany({
      where: {
        publicado: true,
        categorias: {
          some: {
            id: categoria.id
          }
        }
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
      skip,
      take: porPagina
    });
    
    const total = await prisma.noticia.count({
      where: {
        publicado: true,
        categorias: {
          some: {
            id: categoria.id
          }
        }
      }
    });
    
    const paginasTotal = Math.ceil(total / porPagina);
    
    res.render('noticias/categoria', {
      categoria,
      noticias,
      paginaAtual: pagina,
      paginasTotal,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao filtrar por categoria:', error);
    res.status(500).render('error', { mensagem: 'Erro ao filtrar notícias' });
  }
});

// Filtrar notícias por tag
router.get('/tag/:slug', async (req, res) => {
  const { slug } = req.params;
  const pagina = parseInt(req.query.pagina) || 1;
  const porPagina = 10;
  const skip = (pagina - 1) * porPagina;
  
  try {
    const tag = await prisma.tag.findUnique({
      where: { slug }
    });
    
    if (!tag) {
      return res.status(404).render('404');
    }
    
    const noticias = await prisma.noticia.findMany({
      where: {
        publicado: true,
        tags: {
          some: {
            id: tag.id
          }
        }
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
      skip,
      take: porPagina
    });
    
    const total = await prisma.noticia.count({
      where: {
        publicado: true,
        tags: {
          some: {
            id: tag.id
          }
        }
      }
    });
    
    const paginasTotal = Math.ceil(total / porPagina);
    
    res.render('noticias/tag', {
      tag,
      noticias,
      paginaAtual: pagina,
      paginasTotal,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao filtrar por tag:', error);
    res.status(500).render('error', { mensagem: 'Erro ao filtrar notícias' });
  }
});

// Favoritar/desfavoritar notícia
router.post('/favoritar/:id', authMiddleware, async (req, res) => {
  const noticiaId = parseInt(req.params.id);
  const usuarioId = res.locals.user.id;
  
  try {
    const favorito = await prisma.favorito.findFirst({
      where: {
        noticiaId,
        usuarioId
      }
    });
    
    if (favorito) {
      // Remover dos favoritos
      await prisma.favorito.delete({
        where: { id: favorito.id }
      });
      res.json({ favorito: false });
    } else {
      // Adicionar aos favoritos
      await prisma.favorito.create({
        data: {
          noticiaId,
          usuarioId
        }
      });
      res.json({ favorito: true });
    }
  } catch (error) {
    console.error('Erro ao atualizar favorito:', error);
    res.status(500).json({ erro: 'Erro ao processar solicitação' });
  }
});

module.exports = router;
