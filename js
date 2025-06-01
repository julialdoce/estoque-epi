// Sistema de Controle de EPIs - Código Completo

// Dados do sistema
let epis = JSON.parse(localStorage.getItem('epis')) || {};
let historico = JSON.parse(localStorage.getItem('historico')) || [];
let currentSlide = 0;
let currentUser = null;

// Usuários do sistema
const users = {
    'admin': { password: 'admin123', role: 'admin', name: 'Administrador' },
    'operador': { password: 'operador123', role: 'operador', name: 'Operador' }
};

// Canvas para assinatura
let canvas, ctx, isDrawing = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se já está logado
    const savedUser = localStorage.getItem('currentUser');
    if(savedUser) {
        currentUser = JSON.parse(savedUser);
        initApp();
    } else {
        showLogin();
    }
    
    // Configurar formulário de login
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });
});

function showLogin() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('appContainer').style.display = 'none';
}

function initApp() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('appContainer').style.display = 'block';
    
    // Mostrar informações do usuário
    document.getElementById('userInfo').innerHTML = `
        <p>Usuário: ${currentUser.name} (${currentUser.role === 'admin' ? 'Administrador' : 'Operador'})</p>
    `;
    
    // Configurar interface baseada no perfil
    setupInterfaceForUser();
    
    // Inicializar componentes
    initSignaturePad();
    loadSection('dashboard');
    
    // Configurar navegação por tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });
    
    // Configurar formulário de EPI
    document.getElementById('epiForm').addEventListener('submit', function(e) {
        e.preventDefault();
        adicionarEPI();
    });
    
    // Configurar formulário de retirada
    document.getElementById('retiradaForm').addEventListener('submit', function(e) {
        e.preventDefault();
        registrarRetirada();
    });
    
    // Adicionar dados de exemplo (apenas na primeira execução)
    if(Object.keys(epis).length === 0) {
        addExampleData();
    }
}

function setupInterfaceForUser() {
    const estoqueTab = document.getElementById('estoqueTab');
    
    if(currentUser.role === 'admin') {
        estoqueTab.style.display = 'inline-block';
    } else {
        estoqueTab.style.display = 'none';
    }
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if(users[username] && users[username].password === password) {
        currentUser = {
            username: username,
            role: users[username].role,
            name: users[username].name
        };
        
        // Salvar usuário no localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        initApp();
    } else {
        alert('Usuário ou senha incorretos!');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLogin();
}

// Navegação entre seções
function showSection(sectionId) {
    if(sectionId === 'estoque' && currentUser.role !== 'admin') {
        alert('Acesso restrito a administradores!');
        return;
    }
    
    // Atualizar tabs ativas
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-section') === sectionId);
    });
    
    // Carregar a seção
    loadSection(sectionId);
}

function loadSection(sectionId) {
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    const section = document.getElementById(sectionId);
    section.classList.add('active');
    
    // Carregar conteúdo dinâmico
    switch(sectionId) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'estoque':
            updateEstoqueList();
            break;
        case 'retirada':
            initCarousel();
            break;
        case 'historico':
            updateHistorico();
            break;
    }
}

// Funções do sistema de EPIs
function adicionarEPI() {
    if(currentUser.role !== 'admin') {
        alert('Apenas administradores podem adicionar EPIs!');
        return;
    }
    
    const nome = document.getElementById('epiNome').value;
    const tamanho = document.getElementById('epiTamanho').value;
    const quantidade = parseInt(document.getElementById('epiQuantidade').value);
    
    if (!nome || !tamanho || isNaN(quantidade)) {
        alert('Preencha todos os campos corretamente!');
        return;
    }
    
    if (!epis[nome]) {
        epis[nome] = {};
    }
    
    epis[nome][tamanho] = (epis[nome][tamanho] || 0) + quantidade;
    
    saveToLocalStorage();
    document.getElementById('epiForm').reset();
    updateDashboard();
    updateEstoqueList();
    initCarousel();
    
    alert('EPI adicionado com sucesso!');
}

function removerEPI(nome, tamanho = null) {
    if(currentUser.role !== 'admin') {
        alert('Apenas administradores podem remover EPIs!');
        return;
    }
    
    if (!tamanho) {
        // Remover todo o EPI
        if(confirm(`Tem certeza que deseja remover "${nome}" do estoque?`)) {
            delete epis[nome];
        }
    } else {
        // Remover apenas um tamanho específico
        if(confirm(`Tem certeza que deseja remover o tamanho ${tamanho} de "${nome}"?`)) {
            delete epis[nome][tamanho];
            
            // Se não há mais tamanhos, remover o EPI
            if(Object.keys(epis[nome]).length === 0) {
                delete epis[nome];
            }
        }
    }
    
    saveToLocalStorage();
    updateDashboard();
    updateEstoqueList();
    initCarousel();
}

// Carrossel de EPIs
function initCarousel() {
    const container = document.getElementById('carouselContainer');
    const episList = listarEPIs();
    
    if(episList.length === 0) {
        container.innerHTML = `
            <div class="carousel-slide">
                <div class="epi-image">🛡️</div>
                <h3>Nenhum EPI disponível</h3>
                <p>Adicione EPIs ao estoque primeiro</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = episList.map((epi, index) => `
        <div class="carousel-slide" onclick="openRetiradaModal('${epi.nome}')" data-index="${index}">
            <div class="epi-image">${getEpiIcon(epi.nome)}</div>
            <h3>${epi.nome}</h3>
            <p>Tamanho: ${epi.tamanho}</p>
            <p>Quantidade: ${epi.quantidade}</p>
        </div>
    `).join('');
    
    currentSlide = 0;
    updateCarouselPosition();
}

function nextSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    if(slides.length > 1) {
        currentSlide = (currentSlide + 1) % slides.length;
        updateCarouselPosition();
    }
}

function prevSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    if(slides.length > 1) {
        currentSlide = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
        updateCarouselPosition();
    }
}

function updateCarouselPosition() {
    const container = document.getElementById('carouselContainer');
    container.style.transform = `translateX(-${currentSlide * 100}%)`;
}

// Retirada de EPIs
function openRetiradaModal(epiNome) {
    if(!epis[epiNome] || Object.keys(epis[epiNome]).length === 0) {
        alert('Este EPI não está disponível no estoque!');
        return;
    }
    
    document.getElementById('epiSelecionado').value = epiNome;
    
    // Preencher tamanhos disponíveis
    const selectTamanho = document.getElementById('tamanhoRetirada');
    selectTamanho.innerHTML = '<option value="">Selecione o tamanho</option>';
    
    for(let tamanho in epis[epiNome]) {
        if(epis[epiNome][tamanho] > 0) {
            selectTamanho.innerHTML += `<option value="${tamanho}">Tamanho ${tamanho} (${epis[epiNome][tamanho]} disponíveis)</option>`;
        }
    }
    
    // Configurar data e hora atuais
    const now = new Date();
    document.getElementById('dataRetirada').value = now.toISOString().split('T')[0];
    document.getElementById('horaRetirada').value = now.toTimeString().slice(0,5);
    
    // Mostrar modal
    document.getElementById('retiradaModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('retiradaModal').style.display = 'none';
    document.getElementById('retiradaForm').reset();
    clearSignature();
}

function registrarRetirada() {
    const epiNome = document.getElementById('epiSelecionado').value;
    const nome = document.getElementById('nomeCompleto').value;
    const data = document.getElementById('dataRetirada').value;
    const hora = document.getElementById('horaRetirada').value;
    const tamanho = document.getElementById('tamanhoRetirada').value;
    const quantidade = parseInt(document.getElementById('quantidadeRetirada').value);
    
    // Validar campos
    if(!nome || !data || !hora || !tamanho || isNaN(quantidade) || quantidade < 1) {
        alert('Preencha todos os campos corretamente!');
        return;
    }
    
    // Verificar estoque
    if(!epis[epiNome] || !epis[epiNome][tamanho] || epis[epiNome][tamanho] < quantidade) {
        alert('Estoque insuficiente para esta retirada!');
        return;
    }
    
    // Verificar assinatura
    if(!hasSignature()) {
        alert('Por favor, forneça sua assinatura!');
        return;
    }
    
    // Criar registro de retirada
    const retirada = {
        id: Date.now(),
        nome: nome,
        epi: epiNome,
        tamanho: tamanho,
        quantidade: quantidade,
        data: data,
        hora: hora,
        dataHora: `${data} ${hora}`,
        assinatura: canvas.toDataURL(),
        registradoPor: currentUser.username
    };
    
    // Atualizar estoque
    epis[epiNome][tamanho] -= quantidade;
    
    // Se o estoque ficou zerado, remover o tamanho
    if(epis[epiNome][tamanho] === 0) {
        delete epis[epiNome][tamanho];
    }
    
    // Se não há mais tamanhos, remover o EPI
    if(Object.keys(epis[epiNome]).length === 0) {
        delete epis[epiNome];
    }
    
    // Adicionar ao histórico
    historico.unshift(retirada);
    
    // Salvar no localStorage
    saveToLocalStorage();
    
    // Atualizar interface
    updateDashboard();
    updateEstoqueList();
    initCarousel();
    updateHistorico();
    
    closeModal();
    alert('Retirada registrada com sucesso!');
}

// Histórico
function updateHistorico() {
    const tbody = document.getElementById('historicoTable');
    
    if(historico.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Nenhuma retirada registrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = historico.map(item => `
        <tr>
            <td>${item.dataHora}</td>
            <td>${item.nome}</td>
            <td>${item.epi}</td>
            <td>${item.tamanho}</td>
            <td>${item.quantidade}</td>
            <td>
                <button class="action-btn view" onclick="showDetails(${item.id})">Ver</button>
                ${currentUser.role === 'admin' ? 
                    `<button class="action-btn delete" onclick="removerRegistro(${item.id})">Remover</button>` : ''
                }
            </td>
        </tr>
    `).join('');
}

function showDetails(id) {
    const item = historico.find(i => i.id === id);
    if(!item) return;
    
    const modal = document.getElementById('detalhesModal');
    const content = document.getElementById('detalhesContent');
    
    content.innerHTML = `
        <h3>Detalhes da Retirada</h3>
        <p><strong>EPI:</strong> ${item.epi}</p>
        <p><strong>Tamanho:</strong> ${item.tamanho}</p>
        <p><strong>Quantidade:</strong> ${item.quantidade}</p>
        <p><strong>Retirado por:</strong> ${item.nome}</p>
        <p><strong>Data/Hora:</strong> ${item.dataHora}</p>
        <p><strong>Registrado por:</strong> ${item.registradoPor}</p>
        <p><strong>Assinatura:</strong></p>
        <img src="${item.assinatura}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;">
        <br><br>
        <button class="btn" onclick="closeDetailsModal()">Fechar</button>
    `;
    
    modal.style.display = 'block';
}

function closeDetailsModal() {
    document.getElementById('detalhesModal').style.display = 'none';
}

function removerRegistro(id) {
    if(currentUser.role !== 'admin') {
        alert('Apenas administradores podem remover registros!');
        return;
    }
    
    if(confirm('Tem certeza que deseja remover este registro?')) {
        historico = historico.filter(item => item.id !== id);
        saveToLocalStorage();
        updateHistorico();
        updateDashboard();
    }
}

// Dashboard
function updateDashboard() {
    const episList = listarEPIs();
    let totalEstoque = 0;
    let estoqueBaixo = [];
    
    episList.forEach(epi => {
        totalEstoque += epi.quantidade;
        if(epi.quantidade < 10) {
            estoqueBaixo.push(epi);
        }
    });
    
    // Atualizar estatísticas
    document.getElementById('totalEpis').textContent = Object.keys(epis).length;
    document.getElementById('totalEstoque').textContent = totalEstoque;
    document.getElementById('estoqueBaixo').textContent = estoqueBaixo.length;
    
    // Contar retiradas do dia
    const hoje = new Date().toISOString().split('T')[0];
    const retiradasHoje = historico.filter(item => item.data === hoje).length;
    document.getElementById('retiradasDia').textContent = retiradasHoje;
    
    // Atualizar tabela de estoque baixo
    const tbody = document.getElementById('estoqueBaixoTable');
    tbody.innerHTML = estoqueBaixo.length > 0 ? 
        estoqueBaixo.map(epi => `
            <tr>
                <td>${epi.nome}</td>
                <td>${epi.tamanho}</td>
                <td class="low-stock">${epi.quantidade}</td>
                <td><span class="low-stock">⚠️ Baixo</span></td>
            </tr>
        `).join('') : 
        '<tr><td colspan="4" style="text-align: center; color: #666;">Nenhum item com estoque baixo</td></tr>';
}

// Estoque
function updateEstoqueList() {
    const container = document.getElementById('estoqueList');
    const episList = listarEPIsPorNome();
    
    if(episList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">Nenhum EPI cadastrado</p>';
        return;
    }
    
    container.innerHTML = episList.map(epi => `
        <div class="epi-item">
            <h4>${epi.nome}</h4>
            ${Object.entries(epi.tamanhos).map(([tamanho, quantidade]) => `
                <div class="size-info ${quantidade < 10 ? 'low-stock' : ''}">
                    <span>Tamanho ${tamanho}:</span>
                    <span>${quantidade} unidades</span>
                    ${currentUser.role === 'admin' ? 
                        `<button class="btn btn-danger" style="padding: 2px 5px; font-size: 0.8em;" 
                          onclick="removerEPI('${epi.nome}', '${tamanho}')">Remover</button>` : ''
                    }
                </div>
            `).join('')}
            <div class="size-info" style="background: rgba(102, 126, 234, 0.2); font-weight: bold;">
                <span>Total:</span>
                <span>${Object.values(epi.tamanhos).reduce((a, b) => a + b, 0)} unidades</span>
            </div>
            ${currentUser.role === 'admin' ? 
                `<br><button class="btn btn-danger" onclick="removerEPI('${epi.nome}')">Remover EPI</button>` : ''
            }
        </div>
    `).join('');
}

// Funções auxiliares
function listarEPIs() {
    return Object.entries(epis).flatMap(([nome, tamanhos]) => 
        Object.entries(tamanhos).map(([tamanho, quantidade]) => 
            ({ nome, tamanho, quantidade }))
    );
}

function listarEPIsPorNome() {
    return Object.entries(epis).map(([nome, tamanhos]) => 
        ({ nome, tamanhos })
    );
}

function getEpiIcon(nome) {
    const icons = {
        'luva': '🧤',
        'capacete': '⛑️',
        'óculos': '🥽',
        'máscara': '😷',
        'bota': '🥾',
        'colete': '🦺',
        'protetor': '👂',
        'avental': '🥼'
    };
    
    const lowerNome = nome.toLowerCase();
    for(let key in icons) {
        if(lowerNome.includes(key)) {
            return icons[key];
        }
    }
    return '🛡️';
}

function saveToLocalStorage() {
    localStorage.setItem('epis', JSON.stringify(epis));
    localStorage.setItem('historico', JSON.stringify(historico));
}

// Assinatura digital
function initSignaturePad() {
    canvas = document.getElementById('signaturePad');
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                    e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function hasSignature() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return !imageData.data.every(channel => channel === 0);
}

// Dados de exemplo
function addExampleData() {
    epis = {
        'Luva Nitrílica': { '8': 25, '9': 25 },
        'Capacete de Segurança': { 'M': 15, 'G': 10 },
        'Óculos de Proteção': { 'Único': 30 },
        'Máscara PFF2': { 'Único': 5 },
        'Bota de Segurança': { '39': 8, '40': 12, '41': 15, '42': 10 },
        'Avental Impermeável': { 'M': 7, 'G': 12 }
    };
    
    historico = [
        {
            id: 1,
            nome: "João Silva",
            epi: "Luva Nitrílica",
            tamanho: "9",
            quantidade: 2,
            data: new Date().toISOString().split('T')[0],
            hora: "08:30",
            dataHora: `${new Date().toISOString().split('T')[0]} 08:30`,
            assinatura: "",
            registradoPor: "admin"
        },
        {
            id: 2,
            nome: "Maria Souza",
            epi: "Capacete de Segurança",
            tamanho: "M",
            quantidade: 1,
            data: new Date().toISOString().split('T')[0],
            hora: "09:15",
            dataHora: `${new Date().toISOString().split('T')[0]} 09:15`,
            assinatura: "",
            registradoPor: "admin"
        }
    ];
    
    saveToLocalStorage();
}

// Fechar modais clicando fora
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = 'none';
        if(event.target.id === 'retiradaModal') {
            document.getElementById('retiradaForm').reset();
            clearSignature();
        }
    }
}
