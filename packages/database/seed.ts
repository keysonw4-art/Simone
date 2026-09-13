import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const year = new Date().getFullYear();

  // Credencial do super admin: NUNCA hardcoded. Vem de SEED_ADMIN_PASSWORD;
  // se ausente, gera uma aleatória e imprime UMA vez.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@simone.com.br";
  const providedPassword = process.env.SEED_ADMIN_PASSWORD;
  const rawPassword = providedPassword ?? randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  // Em re-seed, NÃO sobrescreve a senha existente (evita reintroduzir uma
  // senha fraca por cima de uma já rotacionada). A senha só é definida na
  // criação inicial.
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "SUPER_ADMIN",
      acceptedTermsAt: new Date(),
    },
    create: {
      publicId: `SIM-${year}-0000`,
      email: adminEmail,
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
    } catch (e) {
      console.error(
        `Erro ao criar bucket ${bucket.id}:`,
        e instanceof Error ? e.message : String(e),
      );
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

  console.log("Super Admin pronto: " + user.email);
  if (!providedPassword) {
    console.log(
      "\n  ⚠️  Senha do super admin gerada automaticamente (só criação nova):\n" +
        `      ${rawPassword}\n` +
        "      Guarde num gerenciador. Defina SEED_ADMIN_PASSWORD pra fixar.\n" +
        "      (Se o admin já existia, a senha NÃO foi alterada por este seed.)\n",
    );
  }
  console.log("Contador publicId inicializado");
  console.log("Buckets do storage garantidos");
  console.log("Curso teste criado: " + course.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
