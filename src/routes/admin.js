const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware, checkRole } = require('../middleware/auth');

//gerenciar usuários
router.get('/usuarios', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const q = req.query.q || '';
    let where = {};
    if (q) {
        where = {
            OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                ...(q.toUpperCase() === 'USER' || q.toUpperCase() === 'EDITOR' || q.toUpperCase() === 'ADMIN' || q.toUpperCase() === 'SUPER_ADMIN'
                    ? [{ role: q.toUpperCase() }]
                    : []),
                ...(Number.isInteger(Number(q)) && Number(q) > 0
                    ? [{ id: Number(q) }]
                    : [])
            ]
        };
    }
    const usuarios = await prisma.usuario.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/usuarios', { user: res.locals.user, usuarios, q });
});

//gerenciar notícias
router.get('/noticias', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const q = req.query.q || '';
    const noticias = await prisma.noticia.findMany({
        where: {
            OR: [
                { titulo: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { id: isNaN(Number(q)) ? undefined : Number(q) }
            ].filter(Boolean)
        },
        include: {
            autor: { select: { username: true } },
            categorias: true,
            tags: true
        },
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/noticias', { user: res.locals.user, noticias, q });
});

//gerenciar comentários
router.get('/comentarios', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const q = req.query.q || '';
    const comentarios = await prisma.comentario.findMany({
        where: {
            OR: [
                { conteudo: { contains: q, mode: 'insensitive' } },
                { id: isNaN(Number(q)) ? undefined : Number(q) }
            ].filter(Boolean)
        },
        include: {
            autor: { select: { username: true } },
            noticia: { select: { titulo: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/comentarios', { user: res.locals.user, comentarios, q });
});

//gerenciar categorias
router.get('/categorias', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const q = req.query.q || '';
    const categorias = await prisma.categoria.findMany({
        where: {
            OR: [
                { nome: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { id: isNaN(Number(q)) ? undefined : Number(q) }
            ].filter(Boolean)
        },
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/categorias', { user: res.locals.user, categorias, q });
});

//gerenciar tags
router.get('/tags', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const q = req.query.q || '';
    const tags = await prisma.tag.findMany({
        where: {
            OR: [
                { nome: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { id: isNaN(Number(q)) ? undefined : Number(q) }
            ].filter(Boolean)
        },
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/tags', { user: res.locals.user, tags, q });
});

//editar usuário (GET)
router.get('/usuarios/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const usuario = await prisma.usuario.findUnique({ where: { id: Number(req.params.id) } });
    if (!usuario) return res.redirect('/admin/usuarios');
    res.render('admin/usuario-editar', { user: res.locals.user, usuario, error: null });
});

//editar usuário (POST)
router.post('/usuarios/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const { username, email, role, podeComentar, apagarFoto, novaSenha } = req.body;
    const usuario = await prisma.usuario.findUnique({ where: { id: Number(req.params.id) } });
    if (!usuario) return res.redirect('/admin/usuarios');

    let newRole = usuario.role;
    //apenas SUPER_ADMIN pode promover para ADMIN/SUPER_ADMIN
    if (role && role !== usuario.role) {
        if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && res.locals.user.role !== 'SUPER_ADMIN') {
            return res.render('admin/usuario-editar', { user: res.locals.user, usuario, error: 'Apenas super admin pode promover para admin ou super admin.' });
        }
        newRole = role;
    }

    let dataUpdate = {
        username,
        email,
        role: newRole,
        podeComentar: podeComentar === 'on'
    };

    //apagar foto de perfil
    if (apagarFoto === 'on' && usuario.imagemPerfilId) {
        await prisma.imagem.delete({ where: { id: usuario.imagemPerfilId } }).catch(() => { });
        dataUpdate.imagemPerfilId = null;
    }

    //alterar senha se informada
    if (novaSenha && novaSenha.length >= 8) {
        const bcrypt = require('bcrypt');
        dataUpdate.senha = await bcrypt.hash(novaSenha, 10);
    }

    await prisma.usuario.update({
        where: { id: usuario.id },
        data: dataUpdate
    });
    res.redirect('/admin/usuarios');
});

//editar notícia (GET)
router.get('/noticias/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const noticia = await prisma.noticia.findUnique({ where: { id: Number(req.params.id) } });
    if (!noticia) return res.redirect('/admin/noticias');
    res.render('admin/noticia-editar', { user: res.locals.user, noticia, error: null });
});

//editar notícia (POST)
router.post('/noticias/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const { titulo, resumo, conteudo, publicado } = req.body;
    await prisma.noticia.update({
        where: { id: Number(req.params.id) },
        data: { titulo, resumo, conteudo, publicado: publicado === 'on' }
    });
    res.redirect('/admin/noticias');
});

//editar comentário (GET)
router.get('/comentarios/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const comentario = await prisma.comentario.findUnique({ where: { id: Number(req.params.id) } });
    if (!comentario) return res.redirect('/admin/comentarios');
    res.render('admin/comentario-editar', { user: res.locals.user, comentario, error: null });
});

//editar comentário (POST)
router.post('/comentarios/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const { conteudo, aprovado } = req.body;
    await prisma.comentario.update({
        where: { id: Number(req.params.id) },
        data: { conteudo, aprovado: aprovado === 'on' }
    });
    res.redirect('/admin/comentarios');
});

//editar categoria (GET)
router.get('/categorias/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const categoria = await prisma.categoria.findUnique({ where: { id: Number(req.params.id) } });
    if (!categoria) return res.redirect('/admin/categorias');
    res.render('admin/categoria-editar', { user: res.locals.user, categoria, error: null });
});

//editar categoria (POST)
router.post('/categorias/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const { nome, slug, descricao } = req.body;
    await prisma.categoria.update({
        where: { id: Number(req.params.id) },
        data: { nome, slug, descricao }
    });
    res.redirect('/admin/categorias');
});

//editar tag (GET)
router.get('/tags/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const tag = await prisma.tag.findUnique({ where: { id: Number(req.params.id) } });
    if (!tag) return res.redirect('/admin/tags');
    res.render('admin/tag-editar', { user: res.locals.user, tag, error: null });
});

//editar tag (POST)
router.post('/tags/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const { nome, slug } = req.body;
    await prisma.tag.update({
        where: { id: Number(req.params.id) },
        data: { nome, slug }
    });
    res.redirect('/admin/tags');
});

module.exports = router;
