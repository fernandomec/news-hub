const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../../middleware/auth');

// Adicionar comentário
router.post('/adicionar', authMiddleware, async (req, res) => {
  const { noticiaId, conteudo, comentarioPaiId } = req.body;
  const autorId = res.locals.user.id;
  
  try {
    // Verificar se usuário pode comentar
    const usuario = await prisma.usuario.findUnique({
      where: { id: autorId },
      select: { podeComentar: true }
    });
    
    if (!usuario.podeComentar) {
      return res.status(403).json({ 
        erro: 'Seu privilégio de comentar está suspenso' 
      });
    }
    
    // Verificar se a notícia existe e permite comentários
    const noticia = await prisma.noticia.findUnique({
      where: { id: parseInt(noticiaId) },
      select: { comentariosAtivados: true }
    });
    
    if (!noticia || !noticia.comentariosAtivados) {
      return res.status(403).json({ 
        erro: 'Esta notícia não permite comentários' 
      });
    }
    
    // Verificar se é uma resposta a um comentário existente
    let parentComentario = null;
    if (comentarioPaiId) {
      parentComentario = await prisma.comentario.findUnique({
        where: { id: parseInt(comentarioPaiId) }
      });
      
      if (!parentComentario) {
        return res.status(404).json({ 
          erro: 'Comentário pai não encontrado' 
        });
      }
    }
    
    // Criar o comentário
    const novoComentario = await prisma.comentario.create({
      data: {
        conteudo,
        aprovado: false, // comentários precisam de aprovação
        autorId,
        noticiaId: parseInt(noticiaId),
        comentarioPaiId: comentarioPaiId ? parseInt(comentarioPaiId) : null
      },
      include: {
        autor: {
          select: {
            username: true,
            imagemPerfil: true
          }
        }
      }
    });
    
    // Atualizar contagem de comentários da notícia
    await prisma.noticia.update({
      where: { id: parseInt(noticiaId) },
      data: { contagemComentarios: { increment: 1 } }
    });
    
    return res.status(201).json({
      mensagem: 'Comentário enviado para aprovação',
      comentario: novoComentario
    });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ erro: 'Erro ao processar comentário' });
  }
});

// Editar comentário (somente o autor pode editar)
router.put('/editar/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { conteudo } = req.body;
  const usuarioId = res.locals.user.id;
  
  try {
    // Verificar se o comentário existe e pertence ao usuário
    const comentario = await prisma.comentario.findUnique({
      where: { id: parseInt(id) },
      select: { autorId: true }
    });
    
    if (!comentario) {
      return res.status(404).json({ erro: 'Comentário não encontrado' });
    }
    
    if (comentario.autorId !== usuarioId && !['ADMIN', 'SUPER_ADMIN'].includes(res.locals.user.role)) {
      return res.status(403).json({ erro: 'Você não tem permissão para editar este comentário' });
    }
    
    // Atualizar o comentário
    await prisma.comentario.update({
      where: { id: parseInt(id) },
      data: {
        conteudo,
        editado: true,
        dataEdicao: new Date(),
        aprovado: false // volta para aprovação após edição
      }
    });
    
    return res.json({ mensagem: 'Comentário atualizado e enviado para aprovação' });
  } catch (error) {
    console.error('Erro ao editar comentário:', error);
    res.status(500).json({ erro: 'Erro ao processar solicitação' });
  }
});

// Denunciar comentário
router.post('/denunciar/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  
  try {
    await prisma.comentario.update({
      where: { id: parseInt(id) },
      data: {
        sinalizado: true,
        motivoSinalizacao: motivo
      }
    });
    
    return res.json({ mensagem: 'Denúncia recebida. Obrigado por ajudar a manter nossa comunidade saudável.' });
  } catch (error) {
    console.error('Erro ao denunciar comentário:', error);
    res.status(500).json({ erro: 'Erro ao processar denúncia' });
  }
});

// Votação em comentários (upvote/downvote)
router.post('/voto/:id/:tipo', authMiddleware, async (req, res) => {
  const { id, tipo } = req.params;
  
  if (tipo !== 'upvote' && tipo !== 'downvote') {
    return res.status(400).json({ erro: 'Tipo de voto inválido' });
  }
  
  try {
    const comentario = await prisma.comentario.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!comentario) {
      return res.status(404).json({ erro: 'Comentário não encontrado' });
    }
    
    // Atualizar a votação
    await prisma.comentario.update({
      where: { id: parseInt(id) },
      data: {
        upvotes: tipo === 'upvote' ? { increment: 1 } : undefined,
        downvotes: tipo === 'downvote' ? { increment: 1 } : undefined,
      }
    });
    
    return res.json({ mensagem: 'Voto registrado com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar voto:', error);
    res.status(500).json({ erro: 'Erro ao processar solicitação' });
  }
});

module.exports = router;
