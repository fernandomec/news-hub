const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware, checkRole } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configuração do Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../public/uploads/temp');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas'));
    }
    cb(null, true);
  }
});

// Middleware de verificação de acesso para admin/editor
const checkAdminEditor = (req, res, next) => {
  if (!res.locals.user || !['ADMIN', 'EDITOR', 'SUPER_ADMIN'].includes(res.locals.user.role)) {
    return res.status(403).render('403', { mensagem: 'Acesso negado' });
  }
  next();
};

// Middleware de verificação para admin
const checkAdmin = (req, res, next) => {
  if (!res.locals.user || !['ADMIN', 'SUPER_ADMIN'].includes(res.locals.user.role)) {
    return res.status(403).render('403', { mensagem: 'Acesso negado' });
  }
  next();
};

// Middleware de verificação para super admin
const checkSuperAdmin = (req, res, next) => {
  if (!res.locals.user || res.locals.user.role !== 'SUPER_ADMIN') {
    return res.status(403).render('403', { mensagem: 'Acesso negado' });
  }
  next();
};

// Dashboard
router.get('/', authMiddleware, checkAdminEditor, async (req, res) => {
  try {
    // Estatísticas gerais
    const totalNoticias = await prisma.noticia.count();
    const totalUsuarios = await prisma.usuario.count();
    const totalComentarios = await prisma.comentario.count();
    
    // Notícias pendentes de aprovação para editores
    const noticiasPendentes = await prisma.noticia.findMany({
      where: {
        publicado: false
      },
      include: {
        autor: {
          select: {
            username: true
          }
        }
      },
      take: 5
    });
    
    // Comentários pendentes de moderação
    const comentariosPendentes = await prisma.comentario.findMany({
      where: {
        aprovado: false
      },
      include: {
        autor: {
          select: {
            username: true
          }
        },
        noticia: {
          select: {
            titulo: true,
            slug: true
          }
        }
      },
      take: 10
    });
    
    // Notícias mais lidas da semana
    const dataUltimaSemana = new Date();
    dataUltimaSemana.setDate(dataUltimaSemana.getDate() - 7);
    
    const noticiasMaisLidas = await prisma.noticia.findMany({
      where: {
        publicado: true
      },
      include: {
        autor: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        visualizacoes: 'desc'
      },
      take: 5
    });
    
    res.render('admin/dashboard', {
      user: res.locals.user,
      totalNoticias,
      totalUsuarios,
      totalComentarios,
      noticiasPendentes,
      comentariosPendentes,
      noticiasMaisLidas
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).render('error', { mensagem: 'Erro ao carregar dashboard' });
  }
});

// GERENCIAMENTO DE NOTÍCIAS ----------------------------------------------

// Listar notícias
router.get('/noticias', authMiddleware, checkAdminEditor, async (req, res) => {
  const pagina = parseInt(req.query.pagina) || 1;
  const porPagina = 15;
  const skip = (pagina - 1) * porPagina;
  
  try {
    // Filtros
    const filtros = {};
    if (req.query.publicado === 'true') filtros.publicado = true;
    if (req.query.publicado === 'false') filtros.publicado = false;
    
    // Se não for ADMIN/SUPER_ADMIN, mostrar apenas as próprias notícias
    if (!['ADMIN', 'SUPER_ADMIN'].includes(res.locals.user.role)) {
      filtros.autorId = res.locals.user.id;
    }
    
    const noticias = await prisma.noticia.findMany({
      where: filtros,
      include: {
        autor: {
          select: {
            username: true
          }
        },
        categorias: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: porPagina
    });
    
    const total = await prisma.noticia.count({
      where: filtros
    });
    
    const paginasTotal = Math.ceil(total / porPagina);
    
    res.render('admin/noticias/listar', {
      noticias,
      paginaAtual: pagina,
      paginasTotal,
      filtros: req.query,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao listar notícias:', error);
    res.status(500).render('error', { mensagem: 'Erro ao listar notícias' });
  }
});

// Formulário para criar notícia
router.get('/noticias/criar', authMiddleware, checkAdminEditor, async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany();
    const tags = await prisma.tag.findMany();
    
    res.render('admin/noticias/criar', {
      categorias,
      tags,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    res.status(500).render('error', { mensagem: 'Erro ao carregar formulário' });
  }
});

// Processar criação de notícia
router.post('/noticias/criar', authMiddleware, checkAdminEditor, upload.single('imagem'), async (req, res) => {
  try {
    const { titulo, slug, resumo, conteudo, categoriaIds, tags, publicar } = req.body;
    
    // Tratamento do slug
    let slugFinal = slug || titulo.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    // Verificar se slug já existe
    const noticiaExistente = await prisma.noticia.findUnique({
      where: { slug: slugFinal }
    });
    
    if (noticiaExistente) {
      slugFinal = `${slugFinal}-${Date.now()}`;
    }
    
    // Processar dados da imagem
    let imagemId = null;
    if (req.file) {
      const imagemBuffer = await sharp(req.file.path)
        .resize(1200) // largura máxima
        .jpeg({ quality: 80 })
        .toBuffer();
      
      // Salvar imagem no banco
      const novaImagem = await prisma.imagem.create({
        data: {
          dados: imagemBuffer,
          tipoMime: 'image/jpeg'
        }
      });
      
      imagemId = novaImagem.id;
      
      // Remover arquivo temporário
      fs.unlinkSync(req.file.path);
    }
    
    // Criar categorias (array de conexões)
    const categorias = categoriaIds ? 
      (Array.isArray(categoriaIds) ? 
        categoriaIds.map(id => ({ id: parseInt(id) })) : 
        [{ id: parseInt(categoriaIds) }]
      ) : [];
    
    // Processar tags
    const tagsList = tags ? tags.split(',').map(tag => tag.trim()) : [];
    const tagObjects = [];
    
    // Para cada tag, buscar ou criar
    for (const tagName of tagsList) {
      if (!tagName) continue;
      
      const tagSlug = tagName.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
      
      let tag = await prisma.tag.findFirst({
        where: { 
          OR: [
            { nome: tagName },
            { slug: tagSlug }
          ]
        }
      });
      
      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            nome: tagName,
            slug: tagSlug
          }
        });
      }
      
      tagObjects.push({ id: tag.id });
    }
    
    // Criar a notícia
    const novaNoticia = await prisma.noticia.create({
      data: {
        titulo,
        slug: slugFinal,
        resumo,
        conteudo,
        publicado: publicar === 'true',
        dataPublicacao: publicar === 'true' ? new Date() : null,
        autorId: res.locals.user.id,
        imagemId,
        categorias: {
          connect: categorias
        },
        tags: {
          connect: tagObjects
        }
      }
    });
    
    res.redirect(`/admin/noticias/editar/${novaNoticia.id}`);
  } catch (error) {
    console.error('Erro ao criar notícia:', error);
    res.status(500).render('error', { mensagem: 'Erro ao criar notícia' });
  }
});

// Editar notícia
router.get('/noticias/editar/:id', authMiddleware, checkAdminEditor, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Buscar notícia
    const noticia = await prisma.noticia.findUnique({
      where: { id },
      include: {
        categorias: true,
        tags: true,
        imagem: true
      }
    });
    
    if (!noticia) {
      return res.status(404).render('404');
    }
    
    // Verificar permissão (se não for admin, só pode editar próprias notícias)
    if (noticia.autorId !== res.locals.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(res.locals.user.role)) {
      return res.status(403).render('403', { mensagem: 'Você não tem permissão para editar esta notícia' });
    }
    
    const categorias = await prisma.categoria.findMany();
    const tags = await prisma.tag.findMany();
    
    res.render('admin/noticias/editar', {
      noticia,
      categorias,
      tags,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao buscar dados para edição:', error);
    res.status(500).render('error', { mensagem: 'Erro ao carregar formulário de edição' });
  }
});

// Processar edição de notícia
router.post('/noticias/editar/:id', authMiddleware, checkAdminEditor, upload.single('imagem'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, slug, resumo, conteudo, categoriaIds, tags, publicar, removerImagem } = req.body;
    
    // Buscar notícia existente
    const noticiaExistente = await prisma.noticia.findUnique({
      where: { id },
      include: { imagem: true }
    });
    
    if (!noticiaExistente) {
      return res.status(404).render('404');
    }
    
    // Verificar permissão
    if (noticiaExistente.autorId !== res.locals.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(res.locals.user.role)) {
      return res.status(403).render('403', { mensagem: 'Você não tem permissão para editar esta notícia' });
    }
    
    // Tratar slug
    let slugFinal = slug || titulo.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    // Verificar se o slug já existe (excluindo a própria notícia)
    const slugExistente = await prisma.noticia.findFirst({
      where: {
        slug: slugFinal,
        id: { not: id }
      }
    });
    
    if (slugExistente) {
      slugFinal = `${slugFinal}-${Date.now()}`;
    }
    
    // Processar imagem
    let imagemId = noticiaExistente.imagemId;
    
    // Remover imagem existente se solicitado
    if (removerImagem === 'true' && imagemId) {
      // Primeiro removemos a relação na notícia para não violar a restrição de chave estrangeira
      await prisma.noticia.update({
        where: { id },
        data: { imagemId: null }
      });
      
      // Depois deletamos a imagem
      await prisma.imagem.delete({
        where: { id: imagemId }
      });
      
      imagemId = null;
    }
    
    // Adicionar nova imagem
    if (req.file) {
      const imagemBuffer = await sharp(req.file.path)
        .resize(1200) // largura máxima
        .jpeg({ quality: 80 })
        .toBuffer();
      
      // Se já tinha uma imagem, atualiza
      if (imagemId) {
        await prisma.imagem.update({
          where: { id: imagemId },
          data: {
            dados: imagemBuffer,
            tipoMime: 'image/jpeg'
          }
        });
      } else {
        // Senão, cria nova
        const novaImagem = await prisma.imagem.create({
          data: {
            dados: imagemBuffer,
            tipoMime: 'image/jpeg'
          }
        });
        imagemId = novaImagem.id;
      }
      
      // Remover arquivo temporário
      fs.unlinkSync(req.file.path);
    }
    
    // Processar categorias
    const categorias = categoriaIds ? 
      (Array.isArray(categoriaIds) ? 
        categoriaIds.map(id => ({ id: parseInt(id) })) : 
        [{ id: parseInt(categoriaIds) }]
      ) : [];
    
    // Processar tags
    const tagsList = tags ? tags.split(',').map(tag => tag.trim()) : [];
    const tagObjects = [];
    
    for (const tagName of tagsList) {
      if (!tagName) continue;
      
      const tagSlug = tagName.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
      
      let tag = await prisma.tag.findFirst({
        where: { 
          OR: [
            { nome: tagName },
            { slug: tagSlug }
          ]
        }
      });
      
      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            nome: tagName,
            slug: tagSlug
          }
        });
      }
      
      tagObjects.push({ id: tag.id });
    }
    
    // Verificar se está publicando agora
    const publicadoAgora = publicar === 'true' && !noticiaExistente.publicado;
    
    // Atualizar a notícia
    const noticiaAtualizada = await prisma.noticia.update({
      where: { id },
      data: {
        titulo,
        slug: slugFinal,
        resumo,
        conteudo,
        publicado: publicar === 'true',
        dataPublicacao: publicadoAgora ? new Date() : noticiaExistente.dataPublicacao,
        imagemId,
        categorias: {
          set: categorias
        },
        tags: {
          set: tagObjects
        }
      }
    });
    
    res.redirect('/admin/noticias');
  } catch (error) {
    console.error('Erro ao atualizar notícia:', error);
    res.status(500).render('error', { mensagem: 'Erro ao atualizar notícia' });
  }
});

// Excluir notícia
router.post('/noticias/excluir/:id', authMiddleware, checkAdminEditor, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Verificar se a notícia existe
    const noticia = await prisma.noticia.findUnique({
      where: { id },
      include: { imagem: true }
    });
    
    if (!noticia) {
      return res.status(404).json({ erro: 'Notícia não encontrada' });
    }
    
    // Verificar permissão
    if (noticia.autorId !== res.locals.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(res.locals.user.role)) {
      return res.status(403).json({ erro: 'Você não tem permissão para excluir esta notícia' });
    }
    
    // Excluir relações primeiro
    await prisma.$transaction([
      // Remover de favoritos
      prisma.favorito.deleteMany({
        where: { noticiaId: id }
      }),
      // Remover acessos
      prisma.acessoNoticia.deleteMany({
        where: { noticiaId: id }
      }),
      // Remover comentários
      prisma.comentario.deleteMany({
        where: { noticiaId: id }
      }),
      // Remover notícia
      prisma.noticia.delete({
        where: { id }
      })
    ]);
    
    // Se tinha imagem, remover
    if (noticia.imagemId) {
      await prisma.imagem.delete({
        where: { id: noticia.imagemId }
      });
    }
    
    res.json({ sucesso: true });
  } catch (error) {
    console.error('Erro ao excluir notícia:', error);
    res.status(500).json({ erro: 'Erro ao excluir notícia' });
  }
});

// GERENCIAMENTO DE CATEGORIAS ----------------------------------------------

// Listar categorias
router.get('/categorias', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        imagem: true,
        _count: {
          select: {
            noticias: true
          }
        }
      },
      orderBy: {
        nome: 'asc'
      }
    });
    
    res.render('admin/categorias/listar', {
      categorias,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).render('error', { mensagem: 'Erro ao listar categorias' });
  }
});

// Formulário para criar categoria
router.get('/categorias/criar', authMiddleware, checkAdmin, (req, res) => {
  res.render('admin/categorias/criar', {
    user: res.locals.user
  });
});

// Processar criação de categoria
router.post('/categorias/criar', authMiddleware, checkAdmin, upload.single('imagem'), async (req, res) => {
  try {
    const { nome, slug, descricao } = req.body;
    
    // Tratamento do slug
    let slugFinal = slug || nome.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    // Verificar se já existe
    const categoriaExistente = await prisma.categoria.findFirst({
      where: { 
        OR: [
          { nome },
          { slug: slugFinal }
        ]
      }
    });
    
    if (categoriaExistente) {
      return res.render('admin/categorias/criar', {
        erro: 'Já existe uma categoria com este nome ou slug',
        user: res.locals.user
      });
    }
    
    // Processar imagem
    let imagemId = null;
    if (req.file) {
      const imagemBuffer = await sharp(req.file.path)
        .resize(800)
        .jpeg({ quality: 80 })
        .toBuffer();
      
      const novaImagem = await prisma.imagem.create({
        data: {
          dados: imagemBuffer,
          tipoMime: 'image/jpeg'
        }
      });
      
      imagemId = novaImagem.id;
      
      // Remover arquivo temporário
      fs.unlinkSync(req.file.path);
    }
    
    // Criar categoria
    await prisma.categoria.create({
      data: {
        nome,
        slug: slugFinal,
        descricao,
        imagemId
      }
    });
    
    res.redirect('/admin/categorias');
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).render('error', { mensagem: 'Erro ao criar categoria' });
  }
});

// GERENCIAMENTO DE USUÁRIOS ----------------------------------------------

// Listar usuários (apenas ADMIN e SUPER_ADMIN)
router.get('/usuarios', authMiddleware, checkAdmin, async (req, res) => {
  const pagina = parseInt(req.query.pagina) || 1;
  const porPagina = 20;
  const skip = (pagina - 1) * porPagina;
  
  try {
    // Filtros
    const filtros = {};
    if (req.query.role) filtros.role = req.query.role;
    
    const usuarios = await prisma.usuario.findMany({
      where: filtros,
      include: {
        imagemPerfil: true,
        _count: {
          select: {
            noticias: true,
            comentarios: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: porPagina
    });
    
    const total = await prisma.usuario.count({
      where: filtros
    });
    
    const paginasTotal = Math.ceil(total / porPagina);
    
    res.render('admin/usuarios/listar', {
      usuarios,
      paginaAtual: pagina,
      paginasTotal,
      filtros: req.query,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).render('error', { mensagem: 'Erro ao listar usuários' });
  }
});

// GERENCIAMENTO DE COMENTÁRIOS ----------------------------------------------

// Listar comentários para moderação
router.get('/comentarios', authMiddleware, checkAdmin, async (req, res) => {
  const pagina = parseInt(req.query.pagina) || 1;
  const porPagina = 20;
  const skip = (pagina - 1) * porPagina;
  
  try {
    // Filtros
    const filtros = {};
    if (req.query.aprovado === 'true') filtros.aprovado = true;
    if (req.query.aprovado === 'false') filtros.aprovado = false;
    if (req.query.sinalizado === 'true') filtros.sinalizado = true;
    
    const comentarios = await prisma.comentario.findMany({
      where: filtros,
      include: {
        autor: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        noticia: {
          select: {
            id: true,
            titulo: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: porPagina
    });
    
    const total = await prisma.comentario.count({
      where: filtros
    });
    
    const paginasTotal = Math.ceil(total / porPagina);
    
    res.render('admin/comentarios/listar', {
      comentarios,
      paginaAtual: pagina,
      paginasTotal,
      filtros: req.query,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao listar comentários:', error);
    res.status(500).render('error', { mensagem: 'Erro ao listar comentários' });
  }
});

// Aprovar/rejeitar comentário
router.post('/comentarios/moderar/:id', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { aprovar } = req.body;
    
    // Se aprovar é false e o comentário existia, decrementar contagem da notícia
    if (aprovar === 'false') {
      const comentario = await prisma.comentario.findUnique({
        where: { id },
        select: { noticiaId: true, aprovado: true }
      });
      
      if (comentario && comentario.aprovado) {
        await prisma.noticia.update({
          where: { id: comentario.noticiaId },
          data: { 
            contagemComentarios: { 
              decrement: 1 
            }
          }
        });
      }
    }
    
    // Atualizar o comentário
    await prisma.comentario.update({
      where: { id },
      data: { 
        aprovado: aprovar === 'true',
        sinalizado: false,
        motivoSinalizacao: null
      }
    });
    
    res.json({ sucesso: true });
  } catch (error) {
    console.error('Erro ao moderar comentário:', error);
    res.status(500).json({ erro: 'Erro ao processar solicitação' });
  }
});

// ESTATÍSTICAS ----------------------------------------------

// Dashboard de estatísticas
router.get('/estatisticas', authMiddleware, checkAdmin, async (req, res) => {
  try {
    // Período
    const periodo = req.query.periodo || '7dias';
    let dataInicio = new Date();
    
    switch(periodo) {
      case '24h':
        dataInicio.setHours(dataInicio.getHours() - 24);
        break;
      case '7dias':
        dataInicio.setDate(dataInicio.getDate() - 7);
        break;
      case '30dias':
        dataInicio.setDate(dataInicio.getDate() - 30);
        break;
      case '90dias':
        dataInicio.setDate(dataInicio.getDate() - 90);
        break;
      case '365dias':
        dataInicio.setDate(dataInicio.getDate() - 365);
        break;
    }
    
    // Notícias mais visualizadas no período
    const noticiasMaisVistas = await prisma.noticia.findMany({
      where: {
        acessos: {
          some: {
            createdAt: { gte: dataInicio }
          }
        }
      },
      include: {
        autor: {
          select: { username: true }
        },
        _count: {
          select: { acessos: true }
        }
      },
      orderBy: {
        visualizacoes: 'desc'
      },
      take: 10
    });
    
    // Notícias mais comentadas
    const noticiasMaisComentadas = await prisma.noticia.findMany({
      where: {
        comentarios: {
          some: {
            aprovado: true,
            createdAt: { gte: dataInicio }
          }
        }
      },
      include: {
        _count: {
          select: { comentarios: true }
        }
      },
      orderBy: {
        contagemComentarios: 'desc'
      },
      take: 10
    });
    
    // Categorias mais acessadas
    const categoriasMaisAcessadas = await prisma.categoria.findMany({
      include: {
        noticias: {
          where: {
            acessos: {
              some: {
                createdAt: { gte: dataInicio }
              }
            }
          },
          select: {
            _count: {
              select: { acessos: true }
            }
          }
        }
      },
      orderBy: {
        noticias: {
          _count: 'desc'
        }
      },
      take: 5
    });
    
    // Total de acessos no período
    const totalAcessos = await prisma.acessoNoticia.count({
      where: {
        createdAt: { gte: dataInicio }
      }
    });
    
    // Novos usuários no período
    const novosUsuarios = await prisma.usuario.count({
      where: {
        createdAt: { gte: dataInicio }
      }
    });
    
    res.render('admin/estatisticas', {
      noticiasMaisVistas,
      noticiasMaisComentadas,
      categoriasMaisAcessadas,
      totalAcessos,
      novosUsuarios,
      periodo,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    res.status(500).render('error', { mensagem: 'Erro ao carregar estatísticas' });
  }
});

module.exports = router;
