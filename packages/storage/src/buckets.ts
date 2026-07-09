export const BUCKETS = {
  // Públicos
  AssetsInstitucionais: "assets-institucionais",
  Banners: "banners",
  ImagensPublicas: "imagens-publicas",
  // Privados
  FotosPerfil: "fotos-perfil",
  ArquivosAlunos: "arquivos-alunos",
  ConteudoExclusivo: "conteudo-exclusivo",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export const PUBLIC_BUCKETS: BucketName[] = [
  BUCKETS.AssetsInstitucionais,
  BUCKETS.Banners,
  BUCKETS.ImagensPublicas,
];

export function isPublicBucket(name: string): boolean {
  return (PUBLIC_BUCKETS as string[]).includes(name);
}
