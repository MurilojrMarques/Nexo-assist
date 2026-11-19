import type { ChatScenario } from "./scenarios";

export const newTicketScenario: ChatScenario = {
  id: "novo-chamado",
  usage: { used: 18, limit: 30 },
  messages: [
    {
      id: "m1",
      role: "user",
      text: "Meu notebook não conecta na VPN desde ontem. Aparece o erro 809.",
    },
    {
      id: "m2",
      role: "agent",
      steps: ["consultou seus chamados", "buscou na central de ajuda"],
      parts: [
        {
          type: "text",
          text: "Não há chamado aberto sobre VPN, e o artigo do erro 809 vale só para Windows 10 — o seu é Windows 11. Vou abrir um chamado.",
          replies: {
            prompt: "Quem está sendo afetado?",
            options: [
              { value: "only-me", label: "Só eu" },
              { value: "my-team", label: "Minha equipe" },
              { value: "company", label: "Toda a empresa" },
              { value: "unknown", label: "Não sei" },
            ],
            selected: "only-me",
          },
        },
      ],
    },
    {
      id: "m3",
      role: "user",
      text: "Só eu. Tenho reunião com um cliente às 14h e preciso da VPN funcionando.",
    },
    {
      id: "m4",
      role: "agent",
      steps: ["classificou a prioridade", "consultou o SLA", "montou o rascunho"],
      parts: [
        {
          type: "text",
          text: "Coloquei prioridade alta por causa da reunião — a resposta chega antes das 14h. Confira antes de eu criar:",
        },
        {
          type: "ticket-draft",
          draft: {
            code: "D-381",
            title: "VPN não conecta no notebook — erro 809",
            description:
              "Desde 20/10 o notebook (Windows 11) não conecta na VPN e mostra o erro 809. Precisa dela para a reunião das 14h.",
            category: "Rede e VPN",
            priority: "Alta",
            responseDue: "13:43",
            affected: "Somente você",
          },
        },
      ],
    },
  ],
};
