# Dashboard de Plantões Médicos - TODO

## Backend / Banco de Dados
- [x] Schema: tabelas plantoes, importacoes, users
- [x] Migration SQL aplicada via webdev_execute_sql
- [x] Helper db.ts com queries de plantões
- [x] Router: importação de planilha xlsx (upload + parse + upsert)
- [x] Router: listagem de plantões com filtros (unidade, mês, especialidade)
- [x] Router: resumo financeiro (bruto/líquido/pago/em aberto) por unidade
- [x] Router: resumo por especialidade/plantão
- [x] Router: relatório de vencimentos com dias em atraso
- [x] Router: relatório de valores em aberto
- [x] Router: listagem de importações realizadas
- [x] Router: dados para gráficos (faturamento por mês, status de pagamento)

## Frontend
- [x] Upload da logo para CDN
- [x] Identidade visual CIS (verde escuro + cinza) no index.css
- [x] Layout principal com header e sidebar
- [x] Página de Dashboard com cards de resumo
- [x] Cards: Médicos Ativos, Total Plantões, Valor Bruto, Valor Líquido, Valor Pago, Em Aberto
- [x] Gráfico: Faturamento por mês (Bruto vs Líquido)
- [x] Gráfico: Status de pagamento (donut)
- [x] Gráfico: Top 5 médicos por valor bruto
- [x] Filtros: mês/ano, unidade, especialidade, tipo de plantão
- [x] Tabela de resumo por unidade com barra de progresso
- [x] Tabela de resumo por especialidade/plantão (bruto/líquido/pago/em aberto)
- [x] Indicadores financeiros consolidados
- [x] Relatório detalhado com tabs (Todos, Em Aberto, Atrasados, Pagos)
- [x] Área de importação de planilhas (drag-and-drop .xlsx)
- [x] Página de histórico de importações
- [x] Exportação CSV do relatório detalhado
- [x] Cálculo automático de dias em atraso

## Testes
- [x] Teste do parser de planilhas xlsx (ARA e FRG)
- [x] Teste de validação de valores bruto/líquido
- [x] Teste do router de autenticação (logout)

## Melhorias Futuras
- [ ] Filtro de busca por nome de médico/razão social
- [ ] Notificação de pagamentos atrasados
- [ ] Exportação PDF do dashboard
- [ ] Suporte automático a novas unidades além de ARA e FRG

## Correções em Andamento
- [x] Analisar estrutura da planilha STA 2026 - RELATORIO PLANTONISTAS.xlsx
- [x] Corrigir parser para detectar unidade STA (Santa Mariana) e outros formatos
- [x] Adicionar campo unidadeNome ao schema e migration
- [x] Atualizar testes para cobrir a nova planilha (7 testes passando)

## Melhorias Solicitadas (Abril 2026) - CONCLUÍDAS
- [x] Corrigir parser para suportar planilha CAR 2026 (Carlópolis)
- [x] Renomear filtro "MÊS" para "MÊS DE PAGAMENTO"
- [x] Exibir valores dos cards como números inteiros (sem decimais)
- [x] Mover card "Indicadores Financeiros" para aba de Relatórios
- [x] Corrigir cálculo do card "Total de Plantões" (soma horas / 12)
- [x] Atualizar testes vitest para cobrir planilha CAR (9 testes passando)

## Correções e Melhorias (Abril 2026 - v3) - CONCLUÍDAS
- [x] Analisar e corrigir parser para planilha FAX 2026 (Faxinal) - 79 registros
- [x] Corrigir bug de data de pagamento (-1 dia por fuso horário) - cellDates:true + UTC
- [x] Corrigir formatação de valores nos cards (R$ 2.210.395,29)
- [x] Implementar log de erros detalhado na importação (erros críticos + avisos)
- [x] Atualizar testes para cobrir FAX, datas e log de erros (14 testes passando)

## Melhoria: Parser Dinâmico de Unidades (Abr 2026) - CONCLUÍDO
- [x] Analisar planilha RBS 2026 (Rio Branco do Sul) - 116 registros em 3 meses
- [x] Parser reescrito para detectar unidade automaticamente sem mapeamento fixo
- [x] Geração automática de código de unidade a partir do nome da cidade
- [x] 17 testes vitest passando (incluindo RBS e detecção dinâmica)

## Correção Crítica: Importação por Especialidade (Abr 2026) - CONCLUÍDA
- [x] Corrigir lógica de delete: agora deleta apenas as especialidades da nova planilha, preservando as demais
- [x] Testado com 4 planilhas FRG (Anestesia, Cirurgia Geral, Pediatria, Clínica Médica) coexistindo
- [x] FRG Jan/2026 agora tem 5 especialidades: Anestesia, Cirurgia Geral, Pediatria, Clínica Médica, Direção Clínica
- [x] 20 testes vitest passando (incluindo 3 novos testes de múltiplas especialidades)

## Regras de Vencimento por Unidade (Abr 2026) - CONCLUÍDO
- [x] Utilitário server/vencimento.ts com feriados nacionais fixos e móveis (2025-2030)
- [x] Grupo 1 (SM, FAX, CAR, ARA, APU): dia 15 fixo + ajuste para dia útil
- [x] Grupo 2 (FOZ, FRG, RBS): 15º dia útil + ajuste para dia útil
- [x] Grupo 3 (GUA): 20º dia útil + ajuste para dia útil
- [x] Backend: procedure list enriquece cada plantão com dataVencimento, regraVencimento e diasAtraso
- [x] Frontend: coluna "Vencimento Calculado" com data e regra abaixo; coluna "Dias Atraso" em vermelho
- [x] Exportação CSV inclui vencimento calculado e regra aplicada
- [x] 17 testes de vencimento + 37 testes totais passando

## Melhorias Dashboard e Relatórios (Abr 2026) - CONCLUÍDAS
- [x] Renomear coluna "Vencimento (Sol. NF)" para "Sol. NF" nos Relatórios
- [x] Criar endpoint de pontualidade de pagamentos por unidade no backend
- [x] Criar card "Índice de Pontualidade" no Dashboard com ranking por unidade
- [x] Card mostra % no prazo, atrasados, em aberto e média de dias de atraso por unidade
- [x] 37 testes passando

## Sistema de Autenticação Próprio (Abr 2026) - CONCLUÍDO
- [x] Schema: tabela app_users (id, nome, email, senha_hash, perfil, ativo, token_recuperacao, token_expira)
- [x] Migration SQL aplicada com sucesso
- [x] authDb.ts: criar, listar, buscar, atualizar, desativar usuários + hash de senha + token de recuperação
- [x] authJwt.ts: geração e validação de JWT para sessões (8h)
- [x] mailer.ts: envio de e-mail de boas-vindas e recuperação de senha via Nodemailer
- [x] Endpoint POST /api/app/auth/login (e-mail + senha, retorna JWT em cookie httpOnly)
- [x] Endpoint POST /api/app/auth/logout
- [x] Endpoint GET /api/app/auth/me (retorna usuário logado)
- [x] Endpoint POST /api/app/auth/recuperar-senha (gera token e envia e-mail)
- [x] Endpoint POST /api/app/auth/redefinir-senha (valida token e redefine senha)
- [x] Endpoint GET /api/app/auth/validar-token (valida token de recuperação)
- [x] Endpoint PUT /api/app/auth/alterar-senha (usuário altera própria senha)
- [x] Endpoint POST /api/app/usuarios (admin cria usuário + envia e-mail de boas-vindas)
- [x] Endpoint GET /api/app/usuarios (admin lista usuários)
- [x] Endpoint PUT /api/app/usuarios/:id (admin edita usuário)
- [x] Endpoint DELETE /api/app/usuarios/:id (admin desativa usuário)
- [x] Página de Login (e-mail + senha, link "Esqueci minha senha")
- [x] Página de Recuperação de Senha (informa e-mail)
- [x] Página de Redefinição de Senha (nova senha via token)
- [x] Página de Gerenciamento de Usuários (somente admin)
- [x] Proteção de rotas: redireciona para login se não autenticado
- [x] Perfil visualização: menus "Importar Planilha" e "Usuários" ocultos + endpoint de upload bloqueado
- [x] Primeiro usuário admin criado automaticamente no primeiro boot (seed)
- [x] DashboardLayout atualizado: menu dinâmico por perfil + modal "Alterar Senha"
- [x] 9 novos testes unitários (50 testes passando)

## Busca por Médico nos Relatórios (Abr 2026) - CONCLUÍDA
- [x] Adicionar campo de busca por nome do médico ou razão social na aba Relatórios
- [x] Filtro de busca funciona em conjunto com os demais filtros existentes
- [x] Busca case-insensitive com termos parciais
- [x] Debounce de 400ms para não disparar requisição a cada tecla
- [x] Botão X para limpar a busca rapidamente
- [x] Mensagem de "nenhum resultado" específica quando busca não encontra médico
- [x] 4 novos testes unitários de busca (41 testes passando)

## Correção: Autenticação e Primeiro Acesso (Abr 2026) - CONCLUÍDO
- [x] Corrigir erro "Não autenticado": cookie agora usa SameSite=None (compatível com proxy HTTPS)
- [x] Adicionar campo senhaTemporaria (boolean) na tabela app_users + migration aplicada
- [x] Login retorna senhaTemporaria no payload
- [x] /api/app/auth/me retorna senhaTemporaria
- [x] Endpoint PUT /api/app/auth/definir-senha (primeiro acesso, sem exigir senha atual)
- [x] Página /primeiro-acesso com indicador de força de senha
- [x] ProtectedRoute redireciona para /primeiro-acesso se senhaTemporaria=true
- [x] Modal de criação exibe senha temporária gerada com botão Copiar
- [x] Tabela de usuários exibe badge "Aguardando 1º acesso" para usuários com senha temporária
- [x] 50 testes passando

## Senha Definida pelo Admin (Abr 2026) - CONCLUÍDO
- [x] Modal de criação: campos senha + confirmar senha (obrigatórios, com mostrar/ocultar)
- [x] Modal de edição: botão "Redefinir senha" expande campos opcionais; ao salvar, usuário é forçado a trocar no próximo acesso
- [x] Backend: endpoint POST aceita senha fornecida pelo admin
- [x] Backend: endpoint PUT aceita nova senha + senhaTemporaria opcionais
- [x] Removido modal de senha aleatória gerada
- [x] 50 testes passando

## Novo Layout de Planilha (Abr 2026) - CONCLUÍDO
- [x] Adicionar campo `status` (CONCLUIDO/PENDENTE) na tabela plantoes + migration aplicada
- [x] Atualizar xlsxParser.ts para ler coluna STATUS do novo modelo
- [x] STATUS mapeado: CONCLUIDO/PAGO/REALIZADO → CONCLUIDO; demais → PENDENTE
- [x] Coluna VENCIMENTO é ignorada se ausente (compatível com ambos os modelos)
- [x] Coluna STATUS Planilha exibida na tabela de Relatórios com badge verde/âmbar
- [x] Filtro por STATUS Planilha nos Relatórios (Todos / Concluído / Pendente)
- [x] CSV exportado inclui coluna "Status Planilha"
- [x] Testado com nova planilha: 4 abas, 0 erros, STATUS lido corretamente
- [x] 50 testes passando

## Correção: STATUS da Planilha (Abr 2026) - CONCLUÍDO
- [x] Diagnosticado: valores reais na planilha são CONCLUIDO, PENDENTE e (vazio)
- [x] Corrigido: parser retorna null quando célula vazia (antes retornava PENDENTE por padrão)
- [x] Corrigido: frontend exibe “—” para registros sem status (null) em vez de badge Pendente
- [x] PENDENTE só exibido quando a planilha tem explicitamente o valor PENDENTE
- [x] 50 testes passando

## Correção: Linhas de Subtotal TOTAL importadas como médicos (Abr 2026) - CONCLUÍDO
- [x] Identificado: linhas TOTAL ficam na coluna do médico com valor "TOTAL:" (coluna 2)
- [x] Parser ampliado: ignora TOTAL, TOTAL:, TOTAL GERAL, SUBTOTAL, SUBTOTAL: e variações
- [x] 3 registros inconsistentes removidos do banco (ids 210494, 210501, 210508)
- [x] Testado: parser não importa mais linhas TOTAL
- [x] 50 testes passando

## Preview de Importação com Confirmação e Filtros Multi-Seleção (Abr 2026) - CONCLUÍDO
- [x] Endpoint POST /api/preview-plantoes: analisa planilha sem salvar nada no banco
- [x] Preview retorna: total de registros por aba, lista de médicos, linhas ignoradas (TOTAL, vazias), avisos
- [x] Importar.tsx: fluxo de 2 passos — Analisar → Preview → Confirmar/Cancelar
- [x] Modal de preview com resumo por aba, lista de médicos identificados e avisos
- [x] Cancelar importação: nenhum dado é salvo no banco
- [x] DashboardFilters.tsx: componente MultiSelect reutilizável com checkboxes
- [x] Filtros: Unidade, Mês, Ano, Especialidade, Tipo de Plantão — todos aceitam múltiplas opções
- [x] Dropdown com checkboxes, badge de contagem, botão X por filtro e botão Limpar todos
- [x] filterSchema no backend: aceita string | string[] e number | number[]
- [x] db.ts: usa inArray quando múltiplos valores são passados
- [x] Home.tsx e Relatorios.tsx: estado e filterInput atualizados para arrays
- [x] 50 testes passando
