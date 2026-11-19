import "dotenv/config";
import { createPrismaClient } from "../src/infra/database/prisma-client.js";
import { Argon2PasswordHasher } from "../src/infra/security/argon2-password-hasher.js";
import type {
  AffectedScope,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "../src/generated/prisma/enums.js";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

type SeedUser = {
  email: string;
  name: string;
  department: string;
  role: Role;
  team?: string;
};

type SeedTicket = {
  code: string;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  affectedScope: AffectedScope;
  title: string;
  description: string;
  requester: string;
  createdDaysAgo: number;
  lastActivityDaysAgo: number;
  dueInHours: number | null;
  resolvedDaysAgo?: number;
};

const users: SeedUser[] = [
  { email: "ana.souza@nexo.com.br", name: "Ana Souza", department: "Financeiro", role: "EMPLOYEE" },
  { email: "bruno.tavares@nexo.com.br", name: "Bruno Tavares", department: "Logística", role: "EMPLOYEE" },
  { email: "carla.mendes@nexo.com.br", name: "Carla Mendes", department: "Comercial", role: "EMPLOYEE" },
  { email: "diego.ramos@nexo.com.br", name: "Diego Ramos", department: "Marketing", role: "EMPLOYEE" },
  { email: "rafael.lima@nexo.com.br", name: "Rafael Lima", department: "TI", role: "ANALYST", team: "Suporte N2" },
  { email: "juliana.costa@nexo.com.br", name: "Juliana Costa", department: "TI", role: "ANALYST", team: "Suporte N1" },
];

const articles = [
  {
    slug: "vpn-erro-809",
    title: "VPN com erro 809",
    category: "NETWORK_VPN",
    tags: ["vpn", "809", "windows 10"],
    content:
      "Reinstale o cliente de VPN pelo portal de softwares e reinicie o computador. Vale apenas para Windows 10; no Windows 11, abra um chamado.",
  },
  {
    slug: "horario-service-desk",
    title: "Horário do service desk",
    category: null,
    tags: ["horário", "plantão", "atendimento"],
    content: "De segunda a sexta, das 8h às 18h. Chamados críticos têm plantão 24 horas.",
  },
  {
    slug: "redefinir-senha-rede",
    title: "Como redefinir a senha da rede",
    category: "ACCESS",
    tags: ["senha", "rede", "bloqueio"],
    content:
      "Acesse senha.nexo.com.br de qualquer computador da empresa, informe o e-mail corporativo e siga o código enviado ao celular cadastrado. A senha nova vale em até 15 minutos.",
  },
  {
    slug: "impressora-imprimindo-em-branco",
    title: "Impressora imprimindo em branco",
    category: "HARDWARE",
    tags: ["impressora", "branco", "toner"],
    content:
      "Confira no painel da impressora se o toner está acima de 10%. Se estiver, cancele a fila no computador e imprima de novo. Persistindo, abra um chamado informando o código da impressora (etiqueta PRN).",
  },
  {
    slug: "outlook-celular",
    title: "Outlook não sincroniza no celular",
    category: "EMAIL",
    tags: ["outlook", "celular", "sincronização", "e-mail"],
    content:
      "Remova a conta do aplicativo Outlook e adicione de novo usando o e-mail corporativo. O celular precisa estar com o Intune instalado e em conformidade.",
  },
  {
    slug: "wifi-visitantes",
    title: "Wi-Fi de visitantes",
    category: "NETWORK_VPN",
    tags: ["wi-fi", "visitantes", "internet"],
    content:
      "A rede Nexo-Visitantes tem senha diária, enviada às 7h para o e-mail de quem solicitou acesso na recepção. Funcionários devem usar a rede Nexo-Corp.",
  },
  {
    slug: "solicitar-software",
    title: "Como solicitar um software",
    category: "SOFTWARE",
    tags: ["software", "licença", "instalação"],
    content:
      "Softwares gratuitos aprovados estão no portal de softwares e instalam sem chamado. Softwares pagos precisam de uma requisição com a aprovação do gestor.",
  },
] as const;

const tickets: SeedTicket[] = [
  {
    code: "INC-20311",
    type: "INCIDENT",
    category: "HARDWARE",
    priority: "MEDIUM",
    status: "WAITING_ANALYST",
    affectedScope: "ONLY_ME",
    title: "Notebook lento após atualização do Windows",
    description: "Lentidão geral desde a atualização. Reiniciar e rodar o diagnóstico da central não resolveu.",
    requester: "ana.souza@nexo.com.br",
    createdDaysAgo: 6,
    lastActivityDaysAgo: 6,
    dueInHours: -72,
  },
  {
    code: "INC-20298",
    type: "INCIDENT",
    category: "ACCESS",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    affectedScope: "ONLY_ME",
    title: "Acesso à pasta Financeiro no SharePoint",
    description: "Sem permissão para abrir a pasta Financeiro/Fechamento desde a troca de equipe.",
    requester: "ana.souza@nexo.com.br",
    createdDaysAgo: 3,
    lastActivityDaysAgo: 1,
    dueInHours: 48,
  },
  {
    code: "REQ-10442",
    type: "REQUEST",
    category: "HARDWARE",
    priority: "LOW",
    status: "APPROVED",
    affectedScope: "ONLY_ME",
    title: "Segundo monitor para home office",
    description: "Pedido de um segundo monitor para trabalho remoto, aprovado pelo gestor.",
    requester: "ana.souza@nexo.com.br",
    createdDaysAgo: 9,
    lastActivityDaysAgo: 7,
    dueInHours: 72,
  },
  {
    code: "INC-20150",
    type: "INCIDENT",
    category: "ACCESS",
    priority: "MEDIUM",
    status: "RESOLVED",
    affectedScope: "ONLY_ME",
    title: "Senha do SAP bloqueada",
    description: "Senha do SAP bloqueada após tentativas erradas.",
    requester: "ana.souza@nexo.com.br",
    createdDaysAgo: 5,
    lastActivityDaysAgo: 4,
    dueInHours: null,
    resolvedDaysAgo: 4,
  },
  {
    code: "INC-19877",
    type: "INCIDENT",
    category: "EMAIL",
    priority: "MEDIUM",
    status: "RESOLVED",
    affectedScope: "ONLY_ME",
    title: "Outlook não sincroniza no celular",
    description: "E-mails não chegam no aplicativo do celular.",
    requester: "ana.souza@nexo.com.br",
    createdDaysAgo: 80,
    lastActivityDaysAgo: 78,
    dueInHours: null,
    resolvedDaysAgo: 78,
  },
  {
    code: "INC-20320",
    type: "INCIDENT",
    category: "HARDWARE",
    priority: "HIGH",
    status: "OPEN",
    affectedScope: "TEAM",
    title: "Leitor de código de barras não lê etiquetas novas",
    description: "Os leitores do armazém 2 não reconhecem o novo modelo de etiqueta.",
    requester: "bruno.tavares@nexo.com.br",
    createdDaysAgo: 0,
    lastActivityDaysAgo: 0,
    dueInHours: 4,
  },
  {
    code: "REQ-10511",
    type: "REQUEST",
    category: "ACCESS",
    priority: "HIGH",
    status: "WAITING_ANALYST",
    affectedScope: "ONLY_ME",
    title: "Acesso ao SAP",
    description: "Acesso ao módulo financeiro do SAP para fechar pedidos ainda hoje.",
    requester: "carla.mendes@nexo.com.br",
    createdDaysAgo: 0,
    lastActivityDaysAgo: 0,
    dueInHours: 3,
  },
  {
    code: "REQ-10460",
    type: "REQUEST",
    category: "SOFTWARE",
    priority: "LOW",
    status: "RESOLVED",
    affectedScope: "ONLY_ME",
    title: "Licença do Adobe Illustrator",
    description: "Licença para a nova campanha.",
    requester: "diego.ramos@nexo.com.br",
    createdDaysAgo: 15,
    lastActivityDaysAgo: 12,
    dueInHours: null,
    resolvedDaysAgo: 12,
  },
];

function readSeedPassword(): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O seed de dados de exemplo não roda em produção.");
  }

  const password = process.env.SEED_USER_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error("Defina SEED_USER_PASSWORD com pelo menos 8 caracteres.");
  }

  return password;
}

function sequenceStart(type: TicketType): number {
  const numbers = tickets.filter((ticket) => ticket.type === type).map((ticket) => Number(ticket.code.slice(4)));
  return Math.max(...numbers);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Defina DATABASE_URL.");
  }

  const passwordHash = await new Argon2PasswordHasher().hash(readSeedPassword());
  const db = createPrismaClient(databaseUrl);
  const now = Date.now();

  try {
    const userIds = new Map<string, string>();

    for (const user of users) {
      const data = { ...user, team: user.team ?? null, passwordHash };
      const saved = await db.user.upsert({
        where: { email: user.email },
        create: data,
        update: { ...data, failedLoginAttempts: 0, lockedUntil: null, isActive: true },
        select: { id: true },
      });
      userIds.set(user.email, saved.id);
    }

    for (const article of articles) {
      const data = { ...article, tags: [...article.tags] };
      await db.knowledgeArticle.upsert({ where: { slug: article.slug }, create: data, update: data });
    }

    for (const ticket of tickets) {
      const requesterId = userIds.get(ticket.requester);

      if (!requesterId) {
        throw new Error(`Solicitante desconhecido: ${ticket.requester}`);
      }

      const lastActivityAt = new Date(now - ticket.lastActivityDaysAgo * DAY_MS);
      const data = {
        code: ticket.code,
        type: ticket.type,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        affectedScope: ticket.affectedScope,
        title: ticket.title,
        description: ticket.description,
        requesterId,
        createdAt: new Date(now - ticket.createdDaysAgo * DAY_MS),
        lastActivityAt,
        dueAt: ticket.dueInHours === null ? null : new Date(now + ticket.dueInHours * HOUR_MS),
        resolvedAt: ticket.resolvedDaysAgo === undefined ? null : new Date(now - ticket.resolvedDaysAgo * DAY_MS),
      };

      const saved = await db.ticket.upsert({
        where: { code: ticket.code },
        create: data,
        update: data,
        select: { id: true },
      });

      await db.ticketUpdate.deleteMany({ where: { ticketId: saved.id } });
      await db.ticketUpdate.create({
        data: {
          ticketId: saved.id,
          authorId: requesterId,
          kind: "CREATED",
          toStatus: "OPEN",
          createdAt: data.createdAt,
        },
      });

      if (ticket.status !== "OPEN") {
        await db.ticketUpdate.create({
          data: {
            ticketId: saved.id,
            kind: "STATUS_CHANGED",
            fromStatus: "OPEN",
            toStatus: ticket.status,
            createdAt: lastActivityAt,
          },
        });
      }
    }

    for (const type of ["INCIDENT", "REQUEST"] as const) {
      const lastNumber = sequenceStart(type);
      await db.ticketSequence.upsert({ where: { type }, create: { type, lastNumber }, update: { lastNumber } });
    }

    console.log(`Seed concluído: ${users.length} usuários, ${articles.length} artigos, ${tickets.length} chamados.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
