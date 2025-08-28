# Comunicação e Idioma

## Idioma de Comunicação

### Idioma Principal

- **Todas as respostas devem ser em Português do Brasil (pt-BR)**
- **Documentação e comentários em português**
- **Mensagens de erro e feedback em português**
- **Explicações técnicas em português**

### Estilo de Comunicação

#### Tom e Linguagem

- **Tom profissional e acessível**
- **Linguagem clara e objetiva**
- **Evitar jargões técnicos desnecessários**
- **Explicar termos técnicos quando necessário**

#### Estrutura das Respostas

- **Usar títulos e subtítulos em português**
- **Organizar informações de forma hierárquica**
- **Incluir exemplos práticos quando relevante**
- **Fornecer contexto antes de detalhes técnicos**

### Terminologia Técnica

#### Termos em Inglês Mantidos

Manter termos técnicos amplamente conhecidos em inglês:

- Framework, Service, Component, Interface
- Observable, Promise, Async/Await
- Git, commit, push, pull, merge
- Build, deploy, staging, production

#### Tradução de Conceitos

- **User** → Usuário
- **Login** → Login/Entrar
- **Logout** → Sair/Desconectar
- **Dashboard** → Painel/Dashboard
- **Settings** → Configurações
- **Profile** → Perfil
- **Error** → Erro
- **Loading** → Carregando
- **Success** → Sucesso

### Formatação de Código

#### Comentários em Código

```typescript
// Carrega a lista de viagens do usuário
carregarViagens(): Observable<Viagem[]> {
  return this.viagensService.recuperarPorUsuario(this.usuarioId);
}

/**
 * Salva uma nova viagem no banco de dados
 * @param viagem - Dados da viagem a ser salva
 * @returns Promise que resolve quando a viagem for salva
 */
async salvarViagem(viagem: Viagem): Promise<void> {
  // Validar dados antes de salvar
  if (!this.validarViagem(viagem)) {
    throw new Error('Dados da viagem são inválidos');
  }

  // Salvar no Firestore
  await this.viagensService.novo(viagem);
}
```

#### Documentação de Métodos

````typescript
/**
 * Calcula o custo total da viagem
 *
 * Este método soma todos os custos associados à viagem,
 * incluindo combustível, hospedagem, alimentação e outros gastos.
 *
 * @param viagemId - ID da viagem para calcular os custos
 * @returns Observable com o valor total em reais (BRL)
 *
 * @example
 * ```typescript
 * this.calcularCustoTotal('viagem-123').subscribe(total => {
 *   console.log(`Custo total: R$ ${total.toFixed(2)}`);
 * });
 * ```
 */
calcularCustoTotal(viagemId: string): Observable<number> {
  // Implementação...
}
````

### Mensagens de Sistema

#### Mensagens de Validação

- "Este campo é obrigatório"
- "Email deve ter um formato válido"
- "A senha deve ter pelo menos 8 caracteres"
- "As senhas não coincidem"
- "Data de início deve ser anterior à data de fim"

#### Mensagens de Feedback

- "Viagem salva com sucesso!"
- "Erro ao salvar a viagem. Tente novamente."
- "Carregando dados..."
- "Nenhuma viagem encontrada"
- "Operação realizada com sucesso"

#### Mensagens de Confirmação

- "Tem certeza que deseja excluir esta viagem?"
- "Esta ação não pode ser desfeita"
- "Deseja salvar as alterações antes de sair?"
- "Dados não salvos serão perdidos"

### Explicações Técnicas

#### Estrutura das Explicações

1. **Contexto**: Explicar o que será feito
2. **Implementação**: Como será implementado
3. **Exemplo**: Código prático
4. **Observações**: Considerações importantes

#### Exemplo de Explicação Técnica

````
## Implementação do Sistema de Cache

### Contexto
Vamos implementar um sistema de cache para melhorar a performance da aplicação,
armazenando dados frequentemente acessados na memória local.

### Implementação
O CacheService utilizará Map para armazenar os dados em memória, com TTL
(Time To Live) configurável para cada entrada.

### Exemplo de Uso
```typescript
// Armazenar dados no cache por 5 minutos
this.cacheService.set('viagens_usuario_123', viagens, 300000);

// Recuperar dados do cache
const viagensCache = this.cacheService.get('viagens_usuario_123');
````

### Observações

- O cache é limpo automaticamente quando o TTL expira
- Dados sensíveis não devem ser armazenados no cache
- O cache é perdido ao recarregar a página

````

### Documentação de APIs

#### Formato Padrão
```typescript
/**
 * Serviço para gerenciamento de viagens
 *
 * Este serviço fornece métodos para criar, editar, excluir e consultar
 * viagens de motocicleta, incluindo funcionalidades offline.
 */
@Injectable({ providedIn: 'root' })
export class ViagensService {

  /**
   * Cria uma nova viagem
   * @param viagem - Dados da viagem a ser criada
   * @throws Error quando os dados são inválidos
   */
  async criarViagem(viagem: Viagem): Promise<void> {
    // Implementação...
  }
}
````

### Tratamento de Erros

#### Mensagens de Erro Padronizadas

```typescript
const MENSAGENS_ERRO = {
  REDE: "Erro de conexão. Verifique sua internet.",
  AUTENTICACAO: "Sessão expirada. Faça login novamente.",
  PERMISSAO: "Você não tem permissão para esta ação.",
  VALIDACAO: "Dados inválidos. Verifique os campos.",
  SERVIDOR: "Erro interno do servidor. Tente novamente.",
  GENERICO: "Ocorreu um erro inesperado.",
};
```

### Logs e Debug

#### Formato de Logs

```typescript
// Log de informação
console.log("[INFO] Viagem carregada com sucesso:", viagem.nome);

// Log de erro
console.error("[ERRO] Falha ao salvar viagem:", error.message);

// Log de debug (apenas em desenvolvimento)
if (!environment.production) {
  console.debug("[DEBUG] Estado atual do formulário:", form.value);
}
```

### Comunicação com Usuário

#### Princípios

- **Clareza**: Mensagens claras e diretas
- **Contexto**: Fornecer informações suficientes para o usuário entender
- **Ação**: Indicar próximos passos quando aplicável
- **Empatia**: Usar linguagem amigável e compreensiva

#### Exemplos de Boas Mensagens

- ✅ "Sua viagem foi salva com sucesso! Você pode visualizá-la no painel principal."
- ✅ "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
- ✅ "Esta viagem possui 3 dias planejados. Deseja realmente excluí-la?"

#### Exemplos de Mensagens a Evitar

- ❌ "Erro 500"
- ❌ "Operação falhou"
- ❌ "Dados inválidos"
