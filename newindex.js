require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const config = require('./config.json');

// ==============================================
// Configurações básicas
// ==============================================
const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'DadosExames';

// Middlewares
app.use(cors());
app.use(express.json());

// ==============================================
// Configuração do Google Sheets API (mantida igual)
// ==============================================
async function getAuthClient() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return await auth.getClient();
  } catch (error) {
    console.error('🔥 Erro na autenticação Google Sheets:', error);
    throw error;
  }
}

async function getSheetData(authClient, range = 'A2:G') {
  try {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${range}`,
    });
    return res.data.values || [];
  } catch (error) {
    console.error('📊 Erro ao acessar planilha:', error);
    throw error;
  }
}

// ==============================================
// Rotas CRUD (com validações do config.json)
// ==============================================

// Validador reutilizável
const validateInput = (field, allowedValues) => (req, res, next) => {
  if (req.body[field] && !allowedValues.includes(req.body[field])) {
    return res.status(400).json({
      error: `Valor inválido para ${field}. Valores permitidos: ${allowedValues.join(', ')}`
    });
  }
  next();
};

// CREATE - Adicionar novo exame (com validações)
app.post('/exames', 
  validateInput('especialidade', config.especialidades),
  validateInput('tipo_exame', [
    ...config.exames.imagem.mamografia,
    ...config.exames.imagem.ultrassonografia,
    ...config.exames.imagem.tomografia,
    ...config.exames.laboratoriais
  ]),
  async (req, res) => {
    try {
      const auth = await getAuthClient();
      const sheets = google.sheets({ version: 'v4', auth });

      const newRow = [
        req.body.id || Date.now().toString(),
        req.body.nome_paciente || '',
        req.body.data_nascimento || '',
        req.body.telefone || '',
        req.body.especialidade,
        req.body.tipo_exame,
        req.body.sub_tipo_exame || '',
        req.body.data_agendamento || '',
        req.body.hora_agendamento || '',
        req.body.status || 'Aguardando agendamento',
        new Date().toISOString(),
        new Date().toISOString(),
        req.body.observacoes || ''
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:M`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] },
      });

      res.status(201).json({ success: true, data: newRow });
    } catch (error) {
      console.error('❌ Erro ao criar exame:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }
);

// READ - Listar exames com filtros
app.get('/exames', async (req, res) => {
  try {
    const auth = await getAuthClient();
    const data = await getSheetData(auth);
    
    const exames = data.map(row => ({
      id: row[0],
      nome_paciente: row[1],
      especialidade: row[4],
      tipo_exame: row[5],
      status: row[9],
      data_agendamento: row[7]
    }));

    // Filtros
    const filtered = exames.filter(exame => {
      return (
        (!req.query.especialidade || exame.especialidade === req.query.especialidade) &&
        (!req.query.status || exame.status === req.query.status)
      );
    });

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('❌ Erro ao listar exames:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ==============================================
// Novas rotas baseadas no config.json
// ==============================================

// Lista de especialidades
app.get('/especialidades', (req, res) => {
  res.json(config.especialidades);
});

// Lista de tipos de exame
app.get('/tipos-exame', (req, res) => {
  res.json(config.exames);
});

// ==============================================
// Inicialização do servidor
// ==============================================
app.listen(PORT, () => {
  console.log(`
  🚀 Servidor rodando na porta ${PORT}
  📊 Total de especialidades: ${config.especialidades.length}
  👉 Endpoints disponíveis:
     - POST /exames
     - GET /exames
     - GET /especialidades
     - GET /tipos-exame
  `);
});