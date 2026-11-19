import type { Analyst, ConsoleMessage, ConversationSummary, EmployeeTicket } from "@/features/console/types";

export const mockAnalyst: Analyst = {
  name: "Rafael Lima",
  email: "rafael.lima@nexo.com.br",
  team: "Suporte N2",
};

export const mockConversations: ConversationSummary[] = [
  {
    id: "ana",
    employee: { name: "Ana Souza", department: "Financeiro", online: true },
    status: "transferred",
    statusDetail: "INC-20311",
    ticketCode: "INC-20311",
    agentPausedUntil: "12:05",
    lastActivity: "10:05",
    unread: 2,
    preview: { kind: "message", from: "employee", text: "Está parado há 5 dias. Quero falar com um analista." },
  },
  {
    id: "carla",
    employee: { name: "Carla Mendes", department: "Comercial", online: true },
    status: "transferred",
    statusDetail: "contato em 25 min",
    ticketCode: "REQ-10511",
    agentPausedUntil: "11:58",
    lastActivity: "09:58",
    unread: 1,
    preview: { kind: "message", from: "employee", text: "Preciso de acesso ao SAP ainda hoje" },
  },
  {
    id: "bruno",
    employee: { name: "Bruno Tavares", department: "Logística", online: false },
    status: "agent-help",
    statusDetail: "confiança 41%",
    lastActivity: "09:51",
    unread: 0,
    preview: { kind: "message", from: "agent", text: "Vou chamar um analista para isso." },
  },
  {
    id: "diego",
    employee: { name: "Diego Ramos", department: "Marketing", online: true },
    status: "agent",
    lastActivity: "agora",
    unread: 0,
    preview: { kind: "typing" },
  },
  {
    id: "elisa",
    employee: { name: "Elisa Prado", department: "Jurídico", online: false },
    status: "agent",
    ticketCode: "INC-20519",
    lastActivity: "10:03",
    unread: 0,
    preview: { kind: "message", from: "agent", text: "Chamado INC-20519 criado." },
  },
  {
    id: "fabio",
    employee: { name: "Fábio Nunes", department: "Operações", online: false },
    status: "resolved",
    lastActivity: "10:01",
    unread: 0,
    preview: { kind: "message", from: "employee", text: "Isso resolveu, obrigado!" },
  },
  {
    id: "gabriela",
    employee: { name: "Gabriela Rocha", department: "RH", online: false },
    status: "resolved",
    lastActivity: "ontem",
    unread: 0,
    preview: { kind: "message", from: "agent", text: "A senha do Wi-Fi foi enviada para o seu e-mail." },
  },
];

export const mockThreads: Record<string, ConsoleMessage[]> = {
  ana: [
    { id: "a0", kind: "day", label: "Hoje" },
    { id: "a1", kind: "employee", text: "Qual o status do meu chamado?", time: "10:01" },
    { id: "a2", kind: "agent", text: "Você tem 3 chamados abertos. Sobre qual deles quer saber?", time: "10:01" },
    { id: "a3", kind: "employee", text: "INC-20311 · Notebook lento após atualização", time: "10:02" },
    {
      id: "a4",
      kind: "agent",
      text: "Está sem atualização há 5 dias, acima do prazo de 3 dias úteis. Quer que eu chame um analista?",
      time: "10:02",
    },
    { id: "a5", kind: "employee", text: "Está parado há 5 dias.", time: "10:04" },
    { id: "a6", kind: "employee", text: "Quero falar com um analista.", time: "10:04" },
    {
      id: "a7",
      kind: "agent",
      text: "Encaminhei para o Suporte N2. Um analista vai falar com você em até 2 h úteis.",
      time: "10:05",
    },
    { id: "a8", kind: "event", event: { type: "transfer", team: "Suporte N2", time: "10:05" } },
  ],
  carla: [
    { id: "c0", kind: "day", label: "Hoje" },
    { id: "c1", kind: "employee", text: "Preciso de acesso ao SAP ainda hoje", time: "09:56" },
    {
      id: "c2",
      kind: "agent",
      text: "Registrei o pedido REQ-10511. Acesso a sistema financeiro precisa de aprovação, então encaminhei para a equipe de Acessos.",
      time: "09:58",
    },
    { id: "c3", kind: "event", event: { type: "transfer", team: "Acessos", time: "09:58" } },
  ],
  bruno: [
    { id: "b0", kind: "day", label: "Hoje" },
    { id: "b1", kind: "employee", text: "O leitor de código de barras do armazém parou de ler as etiquetas novas.", time: "09:49" },
    { id: "b2", kind: "agent", text: "Vou chamar um analista para isso.", time: "09:51" },
  ],
  diego: [
    { id: "d0", kind: "day", label: "Hoje" },
    { id: "d1", kind: "employee", text: "A impressora do 3º andar está imprimindo tudo em branco.", time: "10:06" },
    { id: "d2", kind: "agent", text: "Vou verificar a fila dessa impressora. Ela aparece como “PRN-3A” no seu computador?", time: "10:06" },
  ],
  elisa: [
    { id: "e0", kind: "day", label: "Hoje" },
    { id: "e1", kind: "employee", text: "Meu segundo monitor fica piscando quando conecto no dock.", time: "10:01" },
    { id: "e2", kind: "agent", text: "Chamado INC-20519 criado. A equipe de Hardware responde em até 3 dias úteis.", time: "10:03" },
  ],
  fabio: [
    { id: "f0", kind: "day", label: "Hoje" },
    { id: "f1", kind: "employee", text: "Como libero espaço no OneDrive?", time: "09:55" },
    { id: "f2", kind: "agent", text: "Clique com o botão direito na pasta e escolha “Liberar espaço”. Os arquivos continuam na nuvem.", time: "09:57" },
    { id: "f3", kind: "employee", text: "Isso resolveu, obrigado!", time: "10:01" },
  ],
  gabriela: [
    { id: "g0", kind: "day", label: "Ontem" },
    { id: "g1", kind: "employee", text: "Qual a senha do Wi-Fi de visitantes?", time: "16:20" },
    { id: "g2", kind: "agent", text: "A senha do Wi-Fi foi enviada para o seu e-mail.", time: "16:21" },
  ],
};

export const mockEmployeeTickets: Record<string, EmployeeTicket[]> = {
  ana: [
    { code: "INC-20311", title: "Notebook lento após atualização", status: "Aguardando analista", category: "Hardware", priority: "Média" },
    { code: "INC-20298", title: "Acesso à pasta Financeiro", status: "Em andamento", category: "Acesso", priority: "Média" },
    { code: "REQ-10442", title: "Segundo monitor para home office", status: "Aprovado", category: "Hardware", priority: "Baixa" },
    {
      code: "INC-19877",
      title: "Outlook não sincroniza no celular",
      status: "Resolvido",
      category: "E-mail",
      priority: "Média",
      resolvedAt: "2026-09-02T15:00:00-03:00",
    },
    {
      code: "INC-19410",
      title: "Troca de senha da rede",
      status: "Resolvido",
      category: "Acesso",
      priority: "Baixa",
      resolvedAt: "2026-07-11T10:30:00-03:00",
    },
  ],
  carla: [
    { code: "REQ-10511", title: "Acesso ao SAP", status: "Aguardando analista", category: "Acesso", priority: "Alta" },
  ],
  elisa: [
    { code: "INC-20519", title: "Monitor piscando no dock", status: "Em andamento", category: "Hardware", priority: "Média" },
  ],
};
