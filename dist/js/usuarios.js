// JavaScript para a página de Usuários

document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAutenticacao()) {
        return;
    }

    console.log('Página de usuários carregada.');
});

