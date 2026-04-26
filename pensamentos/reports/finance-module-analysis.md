# Análise do Módulo Finance — HomeManager
> Gerado em: 2026-04-25

---

## 1. Estado Actual do Módulo

### Backend — 100% implementado

| Recurso | Endpoints | Estado |
|---------|-----------|--------|
| Contas | GET, POST, PUT, DELETE, POST import | ✅ |
| Transações | GET (paginado), GET by ID, POST, PUT, DELETE, POST import | ✅ |
| Templates | GET, POST, DELETE, POST apply | ✅ |
| Orçamento | GET, PUT (upsert) | ✅ |
| Câmbio | GET, PUT (upsert) | ✅ |
| Dashboard | GET (calculado em memória) | ✅ |

### Frontend — funcional, mas básico

| Aba | O que tem | O que falta |
|-----|-----------|-------------|
| Painel | Métricas + faturas CC + por categoria + histórico 6 meses | — |
| Transações | Listar + criar + apagar | Editar, filtrar, selecionar conta, paginação |
| Recorrentes | Listar + criar + apagar + aplicar | Editar template |
| Contas | Listar + criar + apagar | Editar |
| Orçamento | Carregar + guardar | — |
| Câmbio | Carregar + guardar | — |
| Import | Transações + contas/cartões | — |

---

## 2. Gaps Concretos (ordenados por impacto)

### GAP-01 — Sem selector de conta no formulário de transação
O formulário de transações não tem o campo `accountId`. Não há como associar uma transação a uma conta via UI — só via import JSON. O backend suporta (`accountId` em `CreateTransactionRequest`), o campo simplesmente não está exposto no formulário.

### GAP-02 — Edição de transações
`PUT /api/finance/transactions/{id}` existe e está implementado no backend, mas a listagem apenas tem botão de apagar. Não há modal ou edição inline.

### GAP-03 — Edição de contas e templates
Mesmo problema que GAP-02 — `PUT /api/finance/accounts/{id}` existe. Sem UI para editar.

### GAP-04 — Paginação na aba Transações
O `getTransactions()` é chamado com `pageSize: 100` (o máximo do backend). Se um mês tiver mais de 100 transações, as restantes são invisíveis. Não há botão "carregar mais" nem paginação.

### GAP-05 — Sem filtros na listagem de transações
O backend aceita `?type=income|expense&category=lf|cf|...` mas a UI não expõe esses filtros. Útil para ver só gastos de uma categoria num mês.

### GAP-06 — Import de transações sem deduplicação
Em `ImportTransactionsAsync`, a variável `skipped` é declarada mas nunca incrementada. O backend insere tudo o que recebe sem verificar duplicados. O frontend valida o formato mas não garante unicidade de conteúdo.

### GAP-07 — Sem edição de templates recorrentes
Templates só podem ser criados ou apagados, não editados.

---

## 3. Lógica da Dashboard — Explicação Detalhada

A dashboard é calculada inteiramente em memória no `GetDashboardAsync` após três queries à DB.

### Queries à base de dados

```
Query 1: finance.rates WHERE household_id = X
         → fallback: { BRL:1, EUR:6.0, USD:5.5, PYG:0.0007 }

Query 2: finance.budget WHERE household_id = X
         → pode ser null (sem orçamento configurado)

Query 3: finance.transactions
           WHERE household_id = X AND ref_month = 'YYYY-MM'
           INCLUDE account
```

O filtro usa `ref_month`, **não a data da transação**. Isso é intencional — é onde a lógica de cartão de crédito entra.

---

### CalcRefMonth — A regra do cartão de crédito

```
CalcRefMonth(date, account):
  SE conta for null OU não for CC OU não tiver closeDay:
    → ref_month = mês da data (comportamento normal)

  SE data.Day > account.CloseDay:
    → ref_month = próximo mês  ← transação entra na fatura seguinte

  SE data.Day <= closeDay:
    → ref_month = mês da data  ← ainda dentro da fatura corrente
```

**Exemplo prático:**
CC com `closeDay = 10`:
- Compra de R$500 em 8/Abril → `RefMonth = "2026-04"` (dentro da fatura de Abril)
- Compra de R$200 em 15/Abril → `RefMonth = "2026-05"` (já na fatura de Maio)

Isto significa que as transações aparecem na dashboard do mês da **fatura**, não do mês da compra.

---

### ToBase() — Conversão para moeda base (BRL)

```
ToBase(amount, currency, rates):
  rate = rates[currency]   ex: EUR → 6.0
  return amount × rate     ex: €100 × 6.0 = R$600

  Se rate = 0: devolve amount sem converter (protecção contra divisão por zero)
```

Todos os valores na resposta da dashboard estão em **BRL**. `BaseCurrency` está hardcoded como `"BRL"`.

---

### Receita, Gastos e Saldo

```
TotalIncome   = Σ ToBase(tx.amount, tx.currency, rates)  WHERE tx.type = "income"
TotalExpenses = Σ ToBase(tx.amount, tx.currency, rates)  WHERE tx.type = "expense"
Balance       = TotalIncome - TotalExpenses               (pode ser negativo)
```

---

### EffectiveIncome — Base para cálculo de percentagens do orçamento

```
SE orçamento configurado E budget.income > 0:
  effectiveIncome = ToBase(budget.income, budget.incomeCurrency, rates)
SENÃO:
  effectiveIncome = TotalIncome (receita real registada no mês)
```

**Porquê existe este conceito?**
Se o salário só cai no dia 5, e hoje é dia 3, `TotalIncome = 0`. O orçamento não poderia calcular percentagens. Com `EffectiveIncome` baseado no orçamento configurado, as barras de progresso mostram valores correctos independentemente de quando a receita é registada.

---

### ByCategory — Progresso por categoria

Para cada uma das 6 categorias (`lf cf co mt pr es`):

```
total      = Σ ToBase(tx.amount, tx.currency, rates)
               WHERE tx.type = "expense" AND tx.category = cat

goalPct    = budget.goals[cat]        ex: 30  (significa 30% do rendimento)
budgetAmt  = effectiveIncome × goalPct / 100
usedPct    = (total / budgetAmt) × 100,  cap em 999%
```

**Exemplo:**
- effectiveIncome = R$10.000
- meta de cf (Custo Fixo) = 40%
- budgetAmt = R$4.000
- total gasto em cf = R$3.200
- usedPct = 80%

Se não houver orçamento configurado: `budgetAmt = 0`, `usedPct = 0` — o frontend esconde as barras de progresso (`@if (cat.budget > 0)`).

---

### Faturas CC (Invoices)

```
para cada conta do tipo "cc" na household:
  invoiceTotal = Σ ToBase(tx.amount, ...)
                   WHERE tx.type = "expense" AND tx.accountId = acc.id
  limitBase    = ToBase(acc.limit, acc.currency, rates)
  usedPct      = (invoiceTotal / limitBase) × 100,  cap em 100%
  isOverLimit  = invoiceTotal > limitBase
```

Mostra **todos** os cartões de crédito da household, mesmo os sem transações (`total = 0`). O limite é convertido para BRL para comparação.

**Cor da barra no frontend:**
- Verde: `usedPct < 75%`
- Amarelo: `75% ≤ usedPct < 100%`
- Vermelho: `isOverLimit = true`

---

### Histórico 6 meses (History)

```
historyMonths = [month-5, month-4, month-3, month-2, month-1, month]
  ex: ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]

Query única: WHERE ref_month IN (historyMonths)

Para cada mês:
  income   = Σ ToBase(...)  WHERE type = "income"
  expenses = Σ ToBase(...)  WHERE type = "expense"
```

A largura das barras no frontend é relativa ao valor máximo encontrado entre todos os meses (normalização visual).

---

## 4. Fluxo Completo da Dashboard

```
DB: rates + budget + transactions(mês activo)
              ↓
         ToBase() → tudo em BRL
              ↓
┌──────────────────────────────────────────────────────┐
│  TotalIncome / TotalExpenses / Balance               │
│                                                      │
│  EffectiveIncome = budget.income OU TotalIncome      │
│                                                      │
│  ByCategory (para cada categoria):                   │
│    total     → real gasto no mês                     │
│    budgetAmt = effectiveIncome × goal%               │
│    usedPct   = total / budgetAmt × 100               │
│                                                      │
│  Invoices (só cartões de crédito):                   │
│    soma gastos no cartão vs limite, em BRL           │
│                                                      │
│  History (6 meses):                                  │
│    receita + gastos por mês, em BRL                  │
└──────────────────────────────────────────────────────┘
```

---

## 5. Notas de Implementação

### Estrutura da base de dados

```
finance.accounts      → contas correntes e cartões de crédito
finance.transactions  → todas as transações, com ref_month calculado
finance.templates     → templates de recorrentes
finance.budget        → singleton por household (UNIQUE household_id)
finance.rates         → singleton por household (UNIQUE household_id)
```

### Moedas suportadas
`BRL`, `EUR`, `USD`, `PYG`

### Categorias de gastos
| Código | Label | Cor |
|--------|-------|-----|
| `lf` | Lazer & Férias | violet |
| `cf` | Custo Fixo | blue |
| `co` | Compras | emerald |
| `mt` | Manutenção | amber |
| `pr` | Pessoal | pink |
| `es` | Essencial | cyan |

### Hungarian notation
Todos os campos privados de instância no backend usam prefixo `m_` (ex: `m_logger`, `m_context`, `m_financeService`).

---

*Este relatório foi gerado automaticamente a partir da análise do código. Para actualizações, consultar o código-fonte directamente.*
