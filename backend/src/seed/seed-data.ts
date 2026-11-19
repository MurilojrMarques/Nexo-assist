import { classifyPriority } from "../domain/service-desk/priority.js";
import { computeDueAt } from "../domain/service-desk/sla.js";
import { isClosedStatus } from "../domain/service-desk/ticket-rules.js";
import type {
  AffectedScope,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "../domain/service-desk/types.js";

const HOUR_MS = 3_600_000;

export type SeedUser = {
  email: string;
  name: string;
  department: string;
  role: "EMPLOYEE" | "ANALYST";
  team: string | null;
};

export type SeedArticle = {
  slug: string;
  title: string;
  category: TicketCategory | null;
  tags: string[];
  content: string;
};

type TicketBlueprint = {
  code: string;
  type: TicketType;
  category: TicketCategory;
  affectedScope: AffectedScope;
  workStopped: boolean;
  deadlineToday: boolean;
  status: TicketStatus;
  title: string;
  description: string;
  requester: string;
  createdHoursAgo: number;
  lastActivityHoursAgo: number;
  resolvedHoursAgo?: number;
};

export type SeedTicket = {
  code: string;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  priorityRule: string;
  status: TicketStatus;
  affectedScope: AffectedScope;
  title: string;
  description: string;
  requester: string;
  createdAt: Date;
  lastActivityAt: Date;
  dueAt: Date | null;
  resolvedAt: Date | null;
};

export const seedUsers: SeedUser[] = [
  { email: "ana.souza@nexo.com.br", name: "Ana Souza", department: "Financeiro", role: "EMPLOYEE", team: null },
  { email: "bruno.tavares@nexo.com.br", name: "Bruno Tavares", department: "Logística", role: "EMPLOYEE", team: null },
  { email: "carla.mendes@nexo.com.br", name: "Carla Mendes", department: "Comercial", role: "EMPLOYEE", team: null },
  { email: "diego.ramos@nexo.com.br", name: "Diego Ramos", department: "Marketing", role: "EMPLOYEE", team: null },
  { email: "elisa.prado@nexo.com.br", name: "Elisa Prado", department: "Jurídico", role: "EMPLOYEE", team: null },
  { email: "rafael.lima@nexo.com.br", name: "Rafael Lima", department: "TI", role: "ANALYST", team: "Suporte N2" },
  { email: "juliana.costa@nexo.com.br", name: "Juliana Costa", department: "TI", role: "ANALYST", team: "Suporte N1" },
];

export const seedArticles: SeedArticle[] = [
  {
    slug: "vpn-erro-809",
    title: "VPN com erro 809",
    category: "NETWORK_VPN",
    tags: ["vpn", "809", "windows 10", "windows 11"],
    content:
      "VPN com erro 809: reinstale o cliente de VPN pelo portal de softwares e reinicie o computador. Vale apenas para Windows 10; no Windows 11, abra um chamado.",
  },
  {
    slug: "horario-service-desk",
    title: "Horário do service desk",
    category: null,
    tags: ["horário", "plantão", "atendimento", "prazo"],
    content: "Horário do service desk: de segunda a sexta, das 8h às 18h. Chamados críticos têm plantão 24 horas.",
  },
  {
    slug: "redefinir-senha-rede",
    title: "Como redefinir a senha da rede",
    category: "ACCESS",
    tags: ["senha", "rede", "bloqueio", "esqueci"],
    content:
      "Acesse senha.nexo.com.br de qualquer computador da empresa, informe o e-mail corporativo e confirme o código enviado ao celular cadastrado. A senha nova vale em até 15 minutos.",
  },
  {
    slug: "senha-sap-bloqueada",
    title: "Senha do SAP bloqueada",
    category: "ACCESS",
    tags: ["sap", "senha", "bloqueio"],
    content:
      "O SAP bloqueia a senha após 5 tentativas erradas. O desbloqueio não é automático: abra um chamado de Acesso informando o usuário SAP.",
  },
  {
    slug: "notebook-lento",
    title: "Notebook lento",
    category: "HARDWARE",
    tags: ["lento", "travando", "desempenho", "atualização"],
    content:
      "Reinicie o notebook e rode o Diagnóstico Nexo pelo portal de softwares. Se a lentidão continuar depois disso, abra um chamado de Hardware informando quando começou.",
  },
  {
    slug: "impressora-imprimindo-em-branco",
    title: "Impressora imprimindo em branco",
    category: "HARDWARE",
    tags: ["impressora", "branco", "toner"],
    content:
      "Confira no painel da impressora se o toner está acima de 10%. Se estiver, cancele a fila no computador e imprima de novo. Persistindo, abra um chamado informando o código da etiqueta PRN.",
  },
  {
    slug: "outlook-celular",
    title: "Outlook não sincroniza no celular",
    category: "EMAIL",
    tags: ["outlook", "celular", "sincronização", "e-mail"],
    content:
      "Remova a conta do aplicativo Outlook e adicione de novo com o e-mail corporativo. O celular precisa estar com o Intune instalado e em conformidade.",
  },
  {
    slug: "acesso-pastas-sharepoint",
    title: "Acesso a pastas no SharePoint",
    category: "ACCESS",
    tags: ["sharepoint", "pasta", "permissão", "acesso"],
    content:
      "O acesso a pastas de outras áreas depende da aprovação do dono da pasta. Peça pelo chamado de Acesso informando o caminho da pasta; a liberação ocorre após a aprovação.",
  },
  {
    slug: "solicitar-software",
    title: "Como solicitar um software",
    category: "SOFTWARE",
    tags: ["software", "licença", "instalação"],
    content:
      "Softwares gratuitos aprovados estão no portal de softwares e instalam sem chamado. Softwares pagos precisam de uma requisição com a aprovação do gestor.",
  },
  {
    slug: "o-que-o-service-desk-atende",
    title: "O que o service desk de TI atende",
    category: "OTHER",
    tags: ["escopo", "rh", "financeiro", "facilities"],
    content:
      "O service desk atende apenas assuntos de TI. Férias, holerite e benefícios são com o RH (portal RH); reembolsos, com o Financeiro; manutenção predial e mobiliário, com Facilities.",
  },
];

const ticketBlueprints: TicketBlueprint[] = [
  {
    code: "INC-20311",
    type: "INCIDENT",
    category: "HARDWARE",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "WAITING_ANALYST",
    title: "Notebook lento após atualização do Windows",
    description:
      "Lentidão geral desde a atualização de 13/11. Reiniciar e rodar o diagnóstico da central não resolveu. Dá para trabalhar, mas devagar.",
    requester: "ana.souza@nexo.com.br",
    createdHoursAgo: 6 * 24,
    lastActivityHoursAgo: 6 * 24,
  },
  {
    code: "INC-20298",
    type: "INCIDENT",
    category: "ACCESS",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "IN_PROGRESS",
    title: "Acesso à pasta Financeiro no SharePoint",
    description: "Sem permissão para abrir a pasta Financeiro/Fechamento desde a troca de equipe. Uma colega envia os arquivos por enquanto.",
    requester: "ana.souza@nexo.com.br",
    createdHoursAgo: 3 * 24,
    lastActivityHoursAgo: 24,
  },
  {
    code: "REQ-10442",
    type: "REQUEST",
    category: "HARDWARE",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "APPROVED",
    title: "Segundo monitor para home office",
    description: "Pedido de um segundo monitor para trabalho remoto, aprovado pelo gestor. Aguardando entrega.",
    requester: "ana.souza@nexo.com.br",
    createdHoursAgo: 9 * 24,
    lastActivityHoursAgo: 7 * 24 - 3,
  },
  {
    code: "INC-20150",
    type: "INCIDENT",
    category: "ACCESS",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "RESOLVED",
    title: "Senha do SAP bloqueada",
    description: "Senha do SAP bloqueada após tentativas erradas. Usava o SAP pelo acesso de uma colega até o desbloqueio.",
    requester: "ana.souza@nexo.com.br",
    createdHoursAgo: 5 * 24,
    lastActivityHoursAgo: 4 * 24,
    resolvedHoursAgo: 4 * 24,
  },
  {
    code: "INC-19877",
    type: "INCIDENT",
    category: "EMAIL",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "RESOLVED",
    title: "Outlook não sincroniza no celular",
    description: "E-mails não chegam no aplicativo do celular; no computador funciona.",
    requester: "ana.souza@nexo.com.br",
    createdHoursAgo: 80 * 24,
    lastActivityHoursAgo: 78 * 24,
    resolvedHoursAgo: 78 * 24,
  },
  {
    code: "INC-20320",
    type: "INCIDENT",
    category: "HARDWARE",
    affectedScope: "TEAM",
    workStopped: true,
    deadlineToday: false,
    status: "WAITING_ANALYST",
    title: "Leitores de código de barras não leem as etiquetas novas",
    description: "Nenhum leitor do armazém 2 reconhece o novo modelo de etiqueta. A expedição da equipe está parada.",
    requester: "bruno.tavares@nexo.com.br",
    createdHoursAgo: 0.5,
    lastActivityHoursAgo: 0.5,
  },
  {
    code: "REQ-10511",
    type: "REQUEST",
    category: "ACCESS",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: true,
    status: "WAITING_ANALYST",
    title: "Acesso ao módulo financeiro do SAP",
    description: "Precisa do módulo financeiro do SAP para fechar pedidos de clientes ainda hoje.",
    requester: "carla.mendes@nexo.com.br",
    createdHoursAgo: 2,
    lastActivityHoursAgo: 2,
  },
  {
    code: "INC-20290",
    type: "INCIDENT",
    category: "NETWORK_VPN",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "OPEN",
    title: "VPN cai a cada 10 minutos",
    description: "A conexão da VPN cai e volta sozinha a cada 10 minutos, em casa e no escritório.",
    requester: "diego.ramos@nexo.com.br",
    createdHoursAgo: 8 * 24,
    lastActivityHoursAgo: 8 * 24,
  },
  {
    code: "REQ-10460",
    type: "REQUEST",
    category: "SOFTWARE",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "RESOLVED",
    title: "Licença do Adobe Illustrator",
    description: "Licença para a nova campanha, aprovada pelo gestor.",
    requester: "diego.ramos@nexo.com.br",
    createdHoursAgo: 15 * 24,
    lastActivityHoursAgo: 12 * 24,
    resolvedHoursAgo: 12 * 24,
  },
  {
    code: "INC-20319",
    type: "INCIDENT",
    category: "HARDWARE",
    affectedScope: "ONLY_ME",
    workStopped: false,
    deadlineToday: false,
    status: "IN_PROGRESS",
    title: "Monitor piscando no dock",
    description: "O segundo monitor pisca quando o notebook está no dock; direto no notebook funciona.",
    requester: "elisa.prado@nexo.com.br",
    createdHoursAgo: 2 * 24,
    lastActivityHoursAgo: 24,
  },
];

function hoursBefore(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * HOUR_MS);
}

export function buildSeedTickets(now: Date): SeedTicket[] {
  return ticketBlueprints.map((blueprint) => {
    const { priority, rule } = classifyPriority(blueprint);
    const lastActivityAt = hoursBefore(now, blueprint.lastActivityHoursAgo);

    return {
      code: blueprint.code,
      type: blueprint.type,
      category: blueprint.category,
      priority,
      priorityRule: rule,
      status: blueprint.status,
      affectedScope: blueprint.affectedScope,
      title: blueprint.title,
      description: blueprint.description,
      requester: blueprint.requester,
      createdAt: hoursBefore(now, blueprint.createdHoursAgo),
      lastActivityAt,
      dueAt: isClosedStatus(blueprint.status) ? null : computeDueAt(priority, lastActivityAt),
      resolvedAt: blueprint.resolvedHoursAgo === undefined ? null : hoursBefore(now, blueprint.resolvedHoursAgo),
    };
  });
}

export function lastSequenceNumber(tickets: SeedTicket[], type: TicketType): number {
  return Math.max(...tickets.filter((ticket) => ticket.type === type).map((ticket) => Number(ticket.code.slice(4))));
}
