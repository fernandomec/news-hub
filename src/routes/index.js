const express = require('express');
const router = express.Router();

const autenticacaoRouter = require('./autenticacao');
const userRouter = require('./user');

//rotas de autenticação
router.use('/', autenticacaoRouter);

//rotas de usuário
router.use('/', userRouter);

//outras rotas gerais (exemplo)
router.get('/test-index-route', (req, res) => {
    res.send('rota de teste de index.js funcionando');
});

module.exports = router;
