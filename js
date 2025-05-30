// Dados do sistema
let epis = JSON.parse(localStorage.getItem('epis')) || {};
let historico = JSON.parse(localStorage.getItem('historico')) || [];
let currentSlide = 0;
let currentUser = null;

// Usuários do sistema (em produção, isso viria de um backend seguro)
const users = {
    'admin': { password: 'admin123', role: 'admin' },
    'operador': { password: 'operador123', role: 'operador' }
};

// Canvas para assinatura
let canvas, ctx, isDrawing = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar modal de login primeiro
    document.getElementById('loginModal').style.display = 'block';
    
    // Configurar formulário de login
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });
});

// Função de login
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if(users[username] && users[username].password === password) {
        currentUser = {
            username: username,
            role: users[username].role
        };
        
        // Esconder modal de login e mostrar aplicação
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        // Mostrar informações do usuário
        document.getElementById('userInfo').textContent = 
            `Usuário: ${currentUser.username} (${currentUser.role === 'admin' ? 'Administrador' : 'Operador'})`;
        
        // Configurar interface baseada no perfil
        setupInterfaceForUser();
        
        // Inicializar componentes
        initSignaturePad();
        updateDashboard();
        updateEstoqueList();
        updateCarousel();
        updateHistorico();
        
        // Set current date and time
        const now = new Date();
        document.getElementById('dataRetirada').value = now.toISOString().split('T')[0];
        document.getElementById('horaRetirada').value = now.toTimeString().slice(0,5);
    } else {
        alert('Usuário ou senha incorretos!');
    }
}

// Função de logout
function logout() {
    currentUser = null;
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('loginForm').reset();
}

// Configurar interface baseada no perfil do usuário
function setupInterfaceForUser() {
    const estoqueTab = document.getElementById('estoqueTab');
    
    if(currentUser.role === 'admin') {
        estoqueTab.style.display = 'block';
    } else {
        estoqueTab.style.display = 'none';
        showSection('retirada'); // Mostrar a seção de retirada por padrão para operadores
    }
}

// Navegação entre seções
function showSection(sectionId) {
    // Se tentar acessar estoque e não for admin, negar acesso
    if(sectionId === 'estoque' && currentUser.role !== 'admin') {
        alert('Acesso restrito a administradores!');
        return;
    }
    
    const sections = document.querySelectorAll('.content-section');
    const tabs = document.querySelectorAll('.nav-tab');
    
    sections.forEach(section => section.classList.remove('active'));
    tabs.forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
}

// ... (o restante do código JavaScript permanece o mesmo, incluindo todas as funções de gerenciamento de EPIs)
// As funções de estoque devem verificar se o usuário é admin antes de executar:
function checkAdminAccess() {
    if(currentUser.role !== 'admin') {
        alert('Acesso restrito a administradores!');
        return false;
    }
    return true;
}

// Exemplo de modificação em uma função que requer acesso admin
document.getElementById('epiForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if(!checkAdminAccess()) return;
    
    // Restante do código do formulário...
});
