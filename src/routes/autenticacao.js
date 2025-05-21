const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d';

const createToken = (id, role) => {
    return jwt.sign({ id, role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

const validatePassword = (password) => {
    if (password.length < 8 || password.length > 20) {
        return 'a senha deve conter entre 8 e 20 caracteres.';
    }
    if (!/\d/.test(password)) {
        return 'a senha deve conter pelo menos 1 número.';
    }
    if (!/[!@#$%^&*]/.test(password)) {
        return 'a senha deve conter pelo menos 1 caractere especial (!, @, #, $, %, ^, &,*).';
    }
    return null;
};

//rota para exibir formulário de registro
router.get('/register', (req, res) => {
    res.render('register', { errors: null, success: null, user: res.locals.user });
});

//rota para processar formulário de registro
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    let errors = [];

    const passwordError = validatePassword(password);
    if (passwordError) {
        errors.push(passwordError);
    }

    if (!username || !email || !password) {
        errors.push('todos os campos são obrigatórios.');
    }

    if (errors.length > 0) {
        return res.status(400).render('register', { errors, success: null, username, email, user: res.locals.user });
    }

    try {
        const existingUserByEmail = await prisma.usuario.findUnique({ where: { email } });
        if (existingUserByEmail) {
            errors.push('este e-mail já está em uso.');
        }

        if (errors.length > 0) {
            return res.status(400).render('register', { errors, success: null, username, email, user: res.locals.user });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.usuario.create({
            data: {
                username,
                email,
                senha: hashedPassword,
                role: 'USER' //padrão para novos usuários
            }
        });

        const token = createToken(newUser.id, newUser.role);
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); //maxAge em ms (1 dia)
        
        //home
        res.redirect('/');

    } catch (error) {
        console.error('erro ao registrar usuário:', error);
        errors.push('erro ao criar conta. tente novamente.');
        res.status(500).render('register', { errors, success: null, username, email, user: res.locals.user });
    }
});

//rota para exibir forms de login
router.get('/login', (req, res) => {
    res.render('login', { errors: null, success: null, user: res.locals.user });
});

//rota para processar forms de login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    let errors = [];

    if (!email || !password) {
        errors.push('e-mail e senha são obrigatórios.');
        return res.status(400).render('login', { errors, success: null, email, user: res.locals.user });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) {
            errors.push('e-mail ou senha inválidos.');
            return res.status(401).render('login', { errors, success: null, email, user: res.locals.user });
        }

        const isMatch = await bcrypt.compare(password, usuario.senha);
        if (!isMatch) {
            errors.push('e-mail ou senha inválidos.');
            return res.status(401).render('login', { errors, success: null, email, user: res.locals.user });
        }

        const token = createToken(usuario.id, usuario.role);
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); //maxAge em 1 dia pro cookie
        
        res.redirect('/');

    } catch (error) {
        console.error('erro ao fazer login:', error);
        errors.push('erro ao tentar fazer login. tente novamente.');
        res.status(500).render('login', { errors, success: null, email, user: res.locals.user });
    }
});

//rota de logout
router.post('/logout', (req, res) => {
    res.cookie('jwt', '', { maxAge: 1, httpOnly: true }); //expira o cookie e httpOnly
    res.status(200).json({ success: true, message: 'logout bem-sucedido' }); //envia resposta JSON
});

//rota para exibir forms de esqueceu a senha
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { errors: null, success: null, user: res.locals.user });
});

//rota para processar forms de esqueceu a senha
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    let errors = [];
    let success = null;

    if (!email) {
        errors.push('o campo e-mail é obrigatório.');
        return res.status(400).render('forgot-password', { errors, success, email, user: res.locals.user });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) {
            success = 'se um usuário com este e-mail existir, um código PIN será enviado.';
            return res.status(200).render('forgot-password', { errors, success, email, user: res.locals.user });
        }
        success = 'se um usuário com este e-mail existir, um código PIN para a redefinição de senha foi enviado.';
        res.status(200).render('forgot-password', { errors: null, success, email: '', user: res.locals.user });
    } catch (error) {
        console.error('erro no processo de esqueceu a senha:', error);
        errors.push('ocorreu um erro. tente novamente.');
        res.status(500).render('forgot-password', { errors, success: null, email, user: res.locals.user });
    }
});

module.exports = router;