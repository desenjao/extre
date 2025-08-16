const express = require('express');
const path = require('path');
const fs = require('fs');


const app = express();
const PORT = 3000;

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
// Configurar EJS como template engine
app.set('view engine', 'ejs');
app.set('views', './views');  // Crie uma pasta 'views' na raiz do projeto

function calcularIdade(dataNascimento) {
    if (!dataNascimento || dataNascimento === '-') return '-';
    
    try {
        // Converte a data no formato DD/MM/AAAA para Date object
        const [dia, mes, ano] = dataNascimento.split('/').map(Number);
        const nasc = new Date(ano, mes - 1, dia);
        
        if (isNaN(nasc.getTime())) return '-'; // Se data inválida

        const hoje = new Date();
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const diffMes = hoje.getMonth() - nasc.getMonth();
        
        if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nasc.getDate())) {
            idade--;
        }

        return idade.toString(); // Retorna como string para exibição
    } catch (e) {
        return '-'; // Em caso de qualquer erro
    }
}

// Middleware para ler os arquivos JSON
function getPacientes(especialidade) {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', `${especialidade}.json`));
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erro ao ler ${especialidade}.json:`, error);
        return [];
    }
}

// Rota para cada especialidade
const especialidades = ['ortopedista', 'casa_rosa', 'psiquiatra', 'exames_gerais'];

especialidades.forEach(especialidade => {
    app.get(`/${especialidade}`, (req, res) => {
        const pacientes = getPacientes(especialidade);
        
        res.render(especialidade, { // Renderiza o arquivo com o mesmo nome da especialidade
            especialidade: especialidade.replace('_', ' ').toUpperCase(),
            pacientes: pacientes,
            calcularIdade: calcularIdade
        });
    });
});
// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});