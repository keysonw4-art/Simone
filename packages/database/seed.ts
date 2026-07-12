import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("031280admin", 10);
  const year = new Date().getFullYear();

  const user = await prisma.user.upsert({
    where: { email: "admin@simone.com.br" },
    update: {
      passwordHash,
      role: "SUPER_ADMIN",
      acceptedTermsAt: new Date(),
    },
    create: {
      publicId: `SIM-${year}-0000`,
      email: "admin@simone.com.br",
      passwordHash,
      name: "Simone Mendes",
      role: "SUPER_ADMIN",
      acceptedTermsAt: new Date(),
    },
  });

  await prisma.publicIdCounter.upsert({
    where: { year },
    update: {},
    create: { year, lastNumber: 0 },
  });

  await prisma.ticketCounter.upsert({
    where: { year },
    update: {},
    create: { year, lastNumber: 0 },
  });

  await prisma.certificateCounter.upsert({
    where: { year },
    update: {},
    create: { year, lastNumber: 0 },
  });

  const buckets = [
    { id: "assets-institucionais", public: true },
    { id: "banners", public: true },
    { id: "imagens-publicas", public: true },
    { id: "fotos-perfil", public: false },
    { id: "arquivos-alunos", public: false },
    { id: "conteudo-exclusivo", public: false },
  ];

  for (const bucket of buckets) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO storage.buckets (id, name, public, "file_size_limit", "allowed_mime_types")
        VALUES ($1, $1, $2, null, null)
        ON CONFLICT (id) DO NOTHING;
      `, bucket.id, bucket.public);
    } catch (e: any) {
      console.error(`Erro ao criar bucket ${bucket.id}:`, e.message);
    }
  }

  // Criando um curso de teste
  const course = await prisma.course.upsert({
    where: { slug: "metodo-simone-mendes" },
    update: {},
    create: {
      title: "Método Simone Mendes",
      description: "O passo a passo definitivo para transformar sua casa e sua vida através da organização inteligente.",
      slug: "metodo-simone-mendes",
      thumbnail: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800",
      modules: {
        create: [
          {
            title: "Módulo 1: Fundamentos",
            description: "Entenda os princípios básicos da organização",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Aula 1: O despertar",
                  description: "Por que a organização muda vidas?",
                  order: 1,
                  vimeoVideoId: "824804225",
                },
                {
                  title: "Aula 2: Desapego",
                  description: "O primeiro passo prático.",
                  order: 2,
                  vimeoVideoId: "824804225",
                },
              ],
            },
          },
          {
            title: "Módulo 2: O Closet",
            description: "Organizando roupas e acessórios",
            order: 2,
            lessons: {
              create: [
                {
                  title: "Aula 3: Dobras Perfeitas",
                  description: "Aprenda as dobras universais.",
                  order: 1,
                  vimeoVideoId: "824804225",
                },
              ],
            },
          }
        ]
      }
    }
  });

  const planSeed = [
    {
      type: "BASIC" as const,
      name: "Básico",
      tagline: "Para começar a organizar",
      priceCents: 4700,
      benefits: [
        "Acesso aos cursos básicos",
        "Materiais complementares introdutórios",
        "Suporte por e-mail",
      ],
      highlight: false,
      order: 1,
    },
    {
      type: "INTERMEDIATE" as const,
      name: "Intermediário",
      tagline: "Para aprofundar a prática",
      priceCents: 9700,
      benefits: [
        "Tudo do plano Básico",
        "Acesso aos cursos intermediários",
        "Checklists e planilhas exclusivas",
        "Suporte prioritário",
      ],
      highlight: true,
      order: 2,
    },
    {
      type: "PREMIUM" as const,
      name: "Premium",
      tagline: "Acesso total ao método",
      priceCents: 19700,
      benefits: [
        "Tudo do plano Intermediário",
        "Acesso a todos os cursos",
        "Conteúdos exclusivos Premium",
        "Atendimento direto com a Simone",
        "Acesso antecipado a novos cursos",
      ],
      highlight: false,
      order: 3,
    },
  ];

  for (const p of planSeed) {
    await prisma.plan.upsert({
      where: { type: p.type },
      update: {},
      create: {
        type: p.type,
        name: p.name,
        tagline: p.tagline,
        priceCents: p.priceCents,
        benefits: JSON.stringify(p.benefits),
        highlight: p.highlight,
        order: p.order,
      },
    });
  }

  console.log("Super Admin pronto: " + user.email);
  console.log("Contador publicId inicializado");
  console.log("Buckets do storage garantidos");
  console.log("Curso teste criado: " + course.title);
  console.log("Planos garantidos: " + planSeed.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
