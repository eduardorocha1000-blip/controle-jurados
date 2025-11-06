// JavaScript para a página de Backup

document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAutenticacao()) {
        return;
    }

    console.log('Página de backup carregada.');
});

