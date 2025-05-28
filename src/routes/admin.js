const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware, checkRole } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// função utilitária para gerar slug
function slugify(text) {
    return text
        .toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // troca não alfanuméricos por -
        .replace(/^-+|-+$/g, ''); // remove - do início/fim
}

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
            categoria: true, // <-- corrigido aqui
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

//exibir formulário de criação de notícia
router.get('/noticias/nova', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const categorias = await prisma.categoria.findMany();
    const tags = await prisma.tag.findMany();
    res.render('admin/noticia-criar', {
        user: res.locals.user,
        categorias,
        tags,
        error: null,
        noticia: null
    });
});

//criar notícia (POST)
router.post('/noticias/nova', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), upload.single('imagem'), async (req, res) => {
    try {
        const { titulo, conteudo, resumo, publicado, categorias, tags, comentariosAtivados } = req.body;
        if (!titulo || !conteudo || !resumo || !categorias) {
            const categoriasList = await prisma.categoria.findMany();
            const tagsList = await prisma.tag.findMany();
            return res.render('admin/noticia-criar', {
                user: res.locals.user,
                categorias: categoriasList,
                tags: tagsList,
                error: 'Preencha todos os campos obrigatórios.',
                noticia: req.body
            });
        }
        let imagemId = null;
        if (req.file && req.file.buffer) {
            const imagem = await prisma.imagem.create({
                data: {
                    dados: Buffer.from(req.file.buffer),
                    tipoMime: req.file.mimetype
                }
            });
            imagemId = imagem.id;
        }
        const slug = slugify(titulo);
        const noticia = await prisma.noticia.create({
            data: {
                titulo,
                slug,
                conteudo,
                resumo,
                publicado: publicado === 'on',
                autorId: res.locals.user.id,
                comentariosAtivados: comentariosAtivados === 'on',
                imagemId,
                categoriaId: Array.isArray(categorias) ? Number(categorias[0]) : Number(categorias), // agora só aceita uma categoria
                tags: tags ? { connect: (Array.isArray(tags) ? tags : [tags]).map(id => ({ id: Number(id) })) } : undefined
            }
        });
        res.redirect('/admin/noticias');
    } catch (error) {
        const categoriasList = await prisma.categoria.findMany();
        const tagsList = await prisma.tag.findMany();
        res.render('admin/noticia-criar', {
            user: res.locals.user,
            categorias: categoriasList,
            tags: tagsList,
            error: 'Erro ao criar notícia.',
            noticia: req.body
        });
    }
});

//editar notícia (GET)
router.get('/noticias/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const noticia = await prisma.noticia.findUnique({
        where: { id: Number(req.params.id) },
        include: { categoria: true, tags: true, imagem: true }
    });
    if (!noticia) return res.redirect('/admin/noticias');
    const categorias = await prisma.categoria.findMany();
    const tags = await prisma.tag.findMany();
    res.render('admin/noticia-editar', {
        user: res.locals.user,
        noticia,
        categorias,
        tags,
        error: null
    });
});

//editar notícia (POST)
router.post('/noticias/:id/editar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), upload.single('imagem'), async (req, res) => {
    try {
        const { titulo, conteudo, resumo, publicado, categorias, tags, comentariosAtivados, apagarImagem } = req.body;
        const noticiaId = Number(req.params.id);
        let dataUpdate = {
            titulo,
            conteudo,
            resumo,
            publicado: publicado === 'on',
            comentariosAtivados: comentariosAtivados === 'on',
            categoriaId: Array.isArray(categorias) ? Number(categorias[0]) : Number(categorias), // só uma categoria
            tags: {
                set: tags ? (Array.isArray(tags) ? tags : [tags]).map(id => ({ id: Number(id) })) : []
            }
        };

        //atualiza slug automaticamente se titulo mudou
        if (titulo) {
            dataUpdate.slug = slugify(titulo);
        }

        //imagem
        const noticia = await prisma.noticia.findUnique({ where: { id: noticiaId } });
        if (apagarImagem === 'on' && noticia.imagemId) {
            await prisma.imagem.delete({ where: { id: noticia.imagemId } }).catch(() => { });
            dataUpdate.imagemId = null;
        } else if (req.file && req.file.buffer) {
            //substitui imagem
            const imagem = await prisma.imagem.create({
                data: {
                    dados: Buffer.from(req.file.buffer),
                    tipoMime: req.file.mimetype
                }
            });
            //apaga imagem antiga se existir
            if (noticia.imagemId) {
                await prisma.imagem.delete({ where: { id: noticia.imagemId } }).catch(() => { });
            }
            dataUpdate.imagemId = imagem.id;
        }

        await prisma.noticia.update({
            where: { id: noticiaId },
            data: dataUpdate
        });
        res.redirect('/admin/noticias');
    } catch (error) {
        const noticia = await prisma.noticia.findUnique({ where: { id: Number(req.params.id) }, include: { categoria: true, tags: true, imagem: true } });
        const categoriasList = await prisma.categoria.findMany();
        const tagsList = await prisma.tag.findMany();
        res.render('admin/noticia-editar', {
            user: res.locals.user,
            noticia,
            categorias: categoriasList,
            tags: tagsList,
            error: 'Erro ao editar notícia.'
        });
    }
});

//apagar notícia
router.post('/noticias/:id/apagar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        await prisma.noticia.delete({ where: { id: Number(req.params.id) } });
        res.redirect('/admin/noticias');
    } catch (error) {
        res.redirect('/admin/noticias');
    }
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

//aprovar comentário
router.post('/comentarios/:id/aprovar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    await prisma.comentario.update({
        where: { id: Number(req.params.id) },
        data: { aprovado: true }
    });
    res.redirect('/admin/comentarios');
});

//apagar comentário
router.post('/comentarios/:id/apagar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    await prisma.comentario.delete({
        where: { id: Number(req.params.id) }
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

// Formulário de nova categoria
router.get('/categorias/nova', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    res.render('admin/categoria-criar', { user: res.locals.user, error: null, categoria: null });
});

// Criar categoria (POST)
router.post('/categorias/nova', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const { nome, slug, descricao } = req.body;
    if (!nome || !slug || !descricao) {
        return res.render('admin/categoria-criar', { user: res.locals.user, error: 'Preencha todos os campos.', categoria: req.body });
    }
    try {
        await prisma.categoria.create({
            data: { nome, slug, descricao }
        });
        res.redirect('/admin/categorias');
    } catch (e) {
        res.render('admin/categoria-criar', { user: res.locals.user, error: 'Erro ao criar categoria.', categoria: req.body });
    }
});

// Remover categoria
router.post('/categorias/:id/apagar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        await prisma.categoria.delete({ where: { id: Number(req.params.id) } });
    } catch (e) {}
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

// Formulário de nova tag
router.get('/tags/nova', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    res.render('admin/tag-criar', { user: res.locals.user, error: null, tag: null });
});

// Criar tag (POST)
router.post('/tags/nova', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const { nome, slug } = req.body;
    if (!nome || !slug) {
        return res.render('admin/tag-criar', { user: res.locals.user, error: 'Preencha todos os campos.', tag: req.body });
    }
    try {
        await prisma.tag.create({
            data: { nome, slug }
        });
        res.redirect('/admin/tags');
    } catch (e) {
        res.render('admin/tag-criar', { user: res.locals.user, error: 'Erro ao criar tag.', tag: req.body });
    }
});

//remover tag
router.post('/tags/:id/apagar', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        await prisma.tag.delete({ where: { id: Number(req.params.id) } });
    } catch (e) {}
    res.redirect('/admin/tags');
});

//remover usuário (GET)
router.get('/usuarios/:id/remover', authMiddleware, checkRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const usuario = await prisma.usuario.findUnique({ where: { id: Number(req.params.id) } });
    if (!usuario) return res.redirect('/admin/usuarios');
    //remove imagem de perfil se existir
    if (usuario.imagemPerfilId) {
        await prisma.imagem.delete({ where: { id: usuario.imagemPerfilId } }).catch(() => {});
    }
    await prisma.usuario.delete({ where: { id: usuario.id } });
    res.redirect('/admin/usuarios');
});

module.exports = router;
