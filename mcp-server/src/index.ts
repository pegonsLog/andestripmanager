#!/usr/bin/env node

/**
 * Servidor MCP para AndesTripManager
 * Expõe dados de viagens via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initializeFirebase } from './firebase.js';
import {
  listarViagens,
  obterViagem,
  listarParadas,
  obterParada,
  listarCustos,
  obterCusto,
  listarDiasViagem,
  obterDiaViagem,
  buscarViagensPorStatus,
  buscarParadasPorTipo,
  buscarCustosPorCategoria
} from './resources.js';
import {
  calcularRelatorioCustos,
  calcularEstatisticasViagem,
  sugerirOtimizacaoRota,
  analisarPadroesGastos
} from './tools.js';

// Inicializa Firebase
initializeFirebase();

// Cria servidor MCP
const server = new Server(
  {
    name: 'andestripmanager-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler para listar recursos disponíveis
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'viagens://list',
        name: 'Lista de Viagens',
        description: 'Lista todas as viagens de um usuário',
        mimeType: 'application/json',
      },
      {
        uri: 'viagem://detail/{id}',
        name: 'Detalhes da Viagem',
        description: 'Detalhes completos de uma viagem específica',
        mimeType: 'application/json',
      },
      {
        uri: 'paradas://list/{viagemId}',
        name: 'Lista de Paradas',
        description: 'Lista todas as paradas de uma viagem',
        mimeType: 'application/json',
      },
      {
        uri: 'custos://list/{viagemId}',
        name: 'Lista de Custos',
        description: 'Lista todos os custos de uma viagem',
        mimeType: 'application/json',
      },
      {
        uri: 'dias://list/{viagemId}',
        name: 'Dias da Viagem',
        description: 'Lista todos os dias de uma viagem',
        mimeType: 'application/json',
      },
    ],
  };
});

/**
 * Handler para ler recursos específicos
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const parts = uri.split('://');
  const [scheme, path] = parts;

  try {
    let data: any;

    switch (scheme) {
      case 'viagens': {
        if (path === 'list') {
          // Requer usuarioId como query parameter
          const url = new URL(uri, 'http://localhost');
          const usuarioId = url.searchParams.get('usuarioId');
          if (!usuarioId) {
            throw new Error('usuarioId é obrigatório');
          }
          data = await listarViagens(usuarioId);
        }
        break;
      }

      case 'viagem': {
        const match = path.match(/^detail\/(.+)$/);
        if (match) {
          const viagemId = match[1];
          data = await obterViagem(viagemId);
        }
        break;
      }

      case 'paradas': {
        const match = path.match(/^list\/(.+)$/);
        if (match) {
          const viagemId = match[1];
          data = await listarParadas(viagemId);
        }
        break;
      }

      case 'custos': {
        const match = path.match(/^list\/(.+)$/);
        if (match) {
          const viagemId = match[1];
          data = await listarCustos(viagemId);
        }
        break;
      }

      case 'dias': {
        const match = path.match(/^list\/(.+)$/);
        if (match) {
          const viagemId = match[1];
          data = await listarDiasViagem(viagemId);
        }
        break;
      }

      default:
        throw new Error(`Esquema de URI não suportado: ${scheme}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
    };
  }
});

/**
 * Handler para listar ferramentas disponíveis
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'listar_viagens',
        description: 'Lista todas as viagens de um usuário',
        inputSchema: {
          type: 'object',
          properties: {
            usuarioId: {
              type: 'string',
              description: 'ID do usuário',
            },
          },
          required: ['usuarioId'],
        },
      },
      {
        name: 'obter_viagem',
        description: 'Obtém detalhes de uma viagem específica',
        inputSchema: {
          type: 'object',
          properties: {
            viagemId: {
              type: 'string',
              description: 'ID da viagem',
            },
          },
          required: ['viagemId'],
        },
      },
      {
        name: 'calcular_relatorio_custos',
        description: 'Calcula relatório detalhado de custos de uma viagem',
        inputSchema: {
          type: 'object',
          properties: {
            viagemId: {
              type: 'string',
              description: 'ID da viagem',
            },
          },
          required: ['viagemId'],
        },
      },
      {
        name: 'calcular_estatisticas_viagem',
        description: 'Calcula estatísticas completas de uma viagem',
        inputSchema: {
          type: 'object',
          properties: {
            viagemId: {
              type: 'string',
              description: 'ID da viagem',
            },
          },
          required: ['viagemId'],
        },
      },
      {
        name: 'sugerir_otimizacao_rota',
        description: 'Sugere otimizações para a rota da viagem',
        inputSchema: {
          type: 'object',
          properties: {
            viagemId: {
              type: 'string',
              description: 'ID da viagem',
            },
          },
          required: ['viagemId'],
        },
      },
      {
        name: 'analisar_padroes_gastos',
        description: 'Analisa padrões de gastos de todas as viagens do usuário',
        inputSchema: {
          type: 'object',
          properties: {
            usuarioId: {
              type: 'string',
              description: 'ID do usuário',
            },
          },
          required: ['usuarioId'],
        },
      },
      {
        name: 'buscar_viagens_por_status',
        description: 'Busca viagens por status (planejada, em-andamento, concluida, cancelada)',
        inputSchema: {
          type: 'object',
          properties: {
            usuarioId: {
              type: 'string',
              description: 'ID do usuário',
            },
            status: {
              type: 'string',
              description: 'Status da viagem',
              enum: ['planejada', 'em-andamento', 'concluida', 'cancelada'],
            },
          },
          required: ['usuarioId', 'status'],
        },
      },
      {
        name: 'listar_paradas',
        description: 'Lista todas as paradas de uma viagem',
        inputSchema: {
          type: 'object',
          properties: {
            viagemId: {
              type: 'string',
              description: 'ID da viagem',
            },
          },
          required: ['viagemId'],
        },
      },
      {
        name: 'buscar_paradas_por_tipo',
        description: 'Busca paradas por tipo (abastecimento, refeicao, hospedagem, etc)',
        inputSchema: {
          type: 'object',
          properties: {
            viagemId: {
              type: 'string',
              description: 'ID da viagem',
            },
            tipo: {
              type: 'string',
              description: 'Tipo da parada',
              enum: ['abastecimento', 'refeicao', 'hospedagem', 'ponto-interesse', 'manutencao', 'outros'],
            },
          },
          required: ['viagemId', 'tipo'],
        },
      },
    ],
  };
});

/**
 * Handler para executar ferramentas
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Verifica se args existe
    if (!args) {
      throw new Error('Argumentos não fornecidos');
    }

    let result: any;

    switch (name) {
      case 'listar_viagens':
        result = await listarViagens(args.usuarioId as string);
        break;

      case 'obter_viagem':
        result = await obterViagem(args.viagemId as string);
        break;

      case 'calcular_relatorio_custos':
        result = await calcularRelatorioCustos(args.viagemId as string);
        break;

      case 'calcular_estatisticas_viagem':
        result = await calcularEstatisticasViagem(args.viagemId as string);
        break;

      case 'sugerir_otimizacao_rota':
        result = await sugerirOtimizacaoRota(args.viagemId as string);
        break;

      case 'analisar_padroes_gastos':
        result = await analisarPadroesGastos(args.usuarioId as string);
        break;

      case 'buscar_viagens_por_status':
        result = await buscarViagensPorStatus(
          args.usuarioId as string,
          args.status as string
        );
        break;

      case 'listar_paradas':
        result = await listarParadas(args.viagemId as string);
        break;

      case 'buscar_paradas_por_tipo':
        result = await buscarParadasPorTipo(
          args.viagemId as string,
          args.tipo as string
        );
        break;

      default:
        throw new Error(`Ferramenta não encontrada: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Inicia o servidor
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Servidor MCP AndesTripManager iniciado');
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
