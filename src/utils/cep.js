document.addEventListener('DOMContentLoaded', function () {
    const cepInput = document.getElementById('cep');
    const enderecoInput = document.getElementById('endereco');
    const bairroInput = document.getElementById('bairro');
    // Adicione outros campos se necessário, ex: cidade, estado
    // const cidadeInput = document.getElementById('cidade');
    // const estadoInput = document.getElementById('estado');

    if (cepInput) {
        cepInput.addEventListener('blur', async function () {
            const cep = this.value.replace(/\D/g, ''); // Remove non-numeric characters

            if (cep.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    if (!response.ok) {
                        throw new Error('CEP não encontrado ou inválido. Status: ' + response.status);
                    }
                    const data = await response.json();

                    if (!data.erro) {
                        if (enderecoInput) enderecoInput.value = data.logradouro || '';
                        if (bairroInput) bairroInput.value = data.bairro || '';
                        // if (cidadeInput) cidadeInput.value = data.localidade || '';
                        // if (estadoInput) estadoInput.value = data.uf || '';
                        
                        // Você pode adicionar aqui um feedback visual ou focar no próximo campo
                    } else {
                        console.warn('CEP não resultou em endereço (ViaCEP retornou erro).');
                        // Limpar campos ou mostrar mensagem de erro seletivamente
                        // if (enderecoInput) enderecoInput.value = '';
                        // if (bairroInput) bairroInput.value = '';
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                    // Tratar erro, talvez mostrar mensagem ao usuário
                }
            } else if (cep.length > 0) {
                console.warn('CEP inválido (não tem 8 dígitos).');
                // Limpar campos ou mostrar mensagem de erro
            }
        });
    }
});
