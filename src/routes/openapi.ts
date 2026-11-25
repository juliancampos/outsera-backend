export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'API de Intervalos entre Prêmios (Pior Filme)',
    version: '1.0.0',
    description: 'Consulta de filmes e dos produtores com menores e maiores intervalos entre prêmios consecutivos.',
  },
  paths: {
    '/api/producers': {
      get: {
        summary: 'Produtores com filtros e ordenação',
        parameters: [
          { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
          {
            name: 'year',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: new Date().getFullYear() },
          },
          { name: 'wins', in: 'query', required: false, schema: { type: 'integer', minimum: 0 } },
          { name: 'onlyWinners', in: 'query', required: false, schema: { type: 'boolean' } },
          {
            name: 'sort',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['wins_desc'] },
          },
        ],
        responses: {
          '200': {
            description: 'Produtores filtrados',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ProducerSummary' } },
              },
            },
          },
          '400': {
            description: 'Parâmetros de consulta inválidos',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Erro interno',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/api/producers/intervals': {
      get: {
        summary: 'Menores e maiores intervalos entre prêmios consecutivos',
        responses: {
          '200': {
            description: 'Intervalos calculados',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Intervals' } },
            },
          },
          '500': {
            description: 'Erro interno',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/api/movies': {
      get: {
        summary: 'Filmes com filtros opcionais',
        parameters: [
          { name: 'year', in: 'query', required: false, schema: { type: 'integer' } },
          { name: 'title', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'studios', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'producers', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'winner', in: 'query', required: false, schema: { type: 'boolean' } },
        ],
        responses: {
          '200': {
            description: 'Filmes filtrados, ordenados por ano e título',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Movie' } },
              },
            },
          },
          '400': {
            description: 'Parâmetros de consulta inválidos',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Erro interno',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
      post: {
        summary: 'Inserir um novo filme',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/NewMovie' } },
          },
        },
        responses: {
          '201': {
            description: 'Filme criado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Movie' } },
            },
          },
          '400': {
            description: 'Corpo inválido ou JSON malformado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          '500': {
            description: 'Erro interno',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ProducerSummary: {
        type: 'object',
        properties: {
          producer: { type: 'string' },
          wins: { type: 'integer' },
          years: { type: 'array', items: { type: 'integer' } },
        },
        required: ['producer', 'wins', 'years'],
      },
      ProducerInterval: {
        type: 'object',
        properties: {
          producer: { type: 'string' },
          interval: { type: 'integer' },
          previousWin: { type: 'integer' },
          followingWin: { type: 'integer' },
        },
        required: ['producer', 'interval', 'previousWin', 'followingWin'],
      },
      Intervals: {
        type: 'object',
        properties: {
          min: { type: 'array', items: { $ref: '#/components/schemas/ProducerInterval' } },
          max: { type: 'array', items: { $ref: '#/components/schemas/ProducerInterval' } },
        },
        required: ['min', 'max'],
      },
      Movie: {
        type: 'object',
        properties: {
          year: { type: 'integer' },
          title: { type: 'string' },
          studios: { type: 'string' },
          producers: { type: 'string' },
          winner: { type: 'boolean' },
        },
        required: ['year', 'title', 'studios', 'producers', 'winner'],
      },
      NewMovie: {
        type: 'object',
        properties: {
          year: {
            type: 'integer',
            description: `Ano do filme, de 1 até ${new Date().getFullYear()}`,
          },
          title: { type: 'string', minLength: 1 },
          studios: { type: 'string', minLength: 1 },
          producers: { type: 'string', minLength: 1 },
          winner: { type: 'string', enum: ['yes'] },
        },
        required: ['year', 'title', 'studios', 'producers'],
        additionalProperties: false,
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
        required: ['error'],
      },
    },
  },
};
