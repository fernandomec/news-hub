const express = require('express');
const router = express.Router();

const autenticacaoRouter = require('./autenticacao');
const userRouter = require('./user');

// Rotas de autenticação
router.use('/', autenticacaoRouter);

// Rotas de usuário
router.use('/', userRouter);

// Outras rotas gerais (exemplo)
router.get('/test-index-route', (req, res) => {
    res.send('rota de teste de index.js funcionando');
});

module.exports = router;
