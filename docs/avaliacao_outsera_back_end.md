# Avaliação -- Back-End

## 1. Especificação do Teste

Desenvolva uma API RESTful para possibilitar a leitura da lista de
indicados e vencedores da categoria **Pior Filme** do Golden Raspberry
Awards.

## 2. Requisitos do Sistema

1.  Ler o arquivo CSV dos filmes e inserir os dados em uma base de dados
    ao iniciar a aplicação.

## 3. Requisitos da API

1.  Obter o produtor com maior intervalo entre dois prêmios
    consecutivos, e o que obteve dois prêmios mais rápido, seguindo a
    especificação de formato definida na página 2.

## 4. Requisitos não funcionais do sistema

1.  O web service RESTful deve ser implementado com base no nível 2 de
    maturidade de Richardson;
2.  Devem ser implementados somente testes de integração. Eles devem
    garantir que os dados obtidos estão de acordo com os dados
    fornecidos na proposta;
3.  O banco de dados deve estar em memória utilizando um SGBD embarcado
    (por exemplo: H2, SQLite). Nenhuma instalação externa deve ser
    necessária;
4.  A aplicação deve conter um readme com instruções para rodar o
    projeto e os testes de integração;
5.  O código-fonte deve ser disponibilizado em um repositório git
    (Github, Gitlab, Bitbucket, etc).

## 5. LLMs, agentes e skills (inteligência artificial)

1.  Para esta vaga, o uso de ferramentas de "inteligência artificial" é
    obrigatório e será avaliado;
2.  O projeto deve conter no repositório um registro de interações com o
    agente. Isto pode ser disponibilizado no formato de logs, lista de
    prompts/skills utilizadas, ou histórico de interações;
3.  A qualidade e desempenho do código serão avaliados nos mesmos
    critérios de uma revisão de código tradicional.

> **Atenção:** Na avaliação serão utilizados outros conjuntos de dados
> com cenários diferentes, portanto é importante garantir a precisão dos
> resultados independente dos dados de entrada.

## 6. Formato da API

**Descrição:** Intervalo de prêmios.

**Formato:**

``` json
{
  "min": [
    {
      "producer": "Producer 1",
      "interval": 1,
      "previousWin": 2008,
      "followingWin": 2009
    },
    {
      "producer": "Producer 2",
      "interval": 1,
      "previousWin": 2018,
      "followingWin": 2019
    }
  ],
  "max": [
    {
      "producer": "Producer 1",
      "interval": 99,
      "previousWin": 1900,
      "followingWin": 1999
    },
    {
      "producer": "Producer 2",
      "interval": 99,
      "previousWin": 2000,
      "followingWin": 2099
    }
  ]
}
```
