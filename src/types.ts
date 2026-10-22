export type UserRole = 'MEMBER' | 'RECEPTION' | 'SECRETARY' | 'ADMIN';

export const CULT_THEMES = [
  'Culto de Primícias',
  'Culto de Missões',
  'Culto de Santa Ceia',
  'Culto da Família',
  'Culto Minha Família no Altar do Senhor',
  'Culto da Vitória',
  'Culto The Search',
  'Culto Circulo de Oração'
] as const;

export type CultTheme = typeof CULT_THEMES[number];

export interface WorshipFrequency {
  id: string;
  cultDate: string; // Formato YYYY-MM-DD
  theme: CultTheme;
  speaker?: string; // Preleitor que ministrou no culto
  totalAttendance: number;
  visitorsAttendance: number;
  childrenAttendance: number;
  membersAttendance?: number; // Campo Calculado no front: totalAttendance - (visitorsAttendance + childrenAttendance)
  adultsAttendance?: number;  // Adultos presentes no culto
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  dateInfo: string; // Ex: "Domingo às 18h"
  type: 'info' | 'event' | 'alert';
  startDate: string; // Formato YYYY-MM-DD
  endDate?: string;  // Formato YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
}

export interface Child {
  name: string;
  cpf: string;
  birthDate: string;
  congregates?: 'Sim' | 'Não' | string;
  departments?: string[];
  departmentStartDate?: string; // Data de entrada no departamento
}

export interface MinisterialEvent {
  id: string;
  type: 'PROMOÇÃO' | 'MUDANÇA_CARGO' | 'ENTRADA_DEPTO' | 'SAÍDA_DEPTO' | 'CONSAGRAÇÃO' | 'OUTRO';
  description: string;
  position?: string;
  department?: string;
  date: string;
  registeredBy: string;
}

export interface Member {
  id: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  
  // Basic Info
  firstName: string;
  lastName?: string;
  cpf: string;
  rg: string;
  birthDate: string;
  naturalness: string;
  nationality: string;
  maritalStatus: string;
  
  // Family
  marriageDate?: string;
  spouseName?: string;
  hasChildren: boolean;
  children?: Child[];
  
  // Address
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  
  // Contact
  phones: string[];
  cell: string; // WhatsApp
  
  // Professional
  education: string;
  profession: string;
  
  // Spiritual
  isBaptized: boolean;
  baptismChurch?: string;
  baptismDate?: string;
  isHolySpiritBaptized: boolean;
  entryDate: string; // Year
  previousChurch?: string;
  participatesInConvention: boolean;
  conventionName?: string;
  receivedAs: 'MEMBRO' | 'CONGREGADO';
  
  // Ministerial (New structure)
  currentPosition: string;
  positionStartDate: string;
  departments: string[];
  departmentRoles?: Record<string, string | string[]>; // Mapeia "Nome do Departamento" -> Papel ou lista de papéis (ex: "Líder", ["Líder", "Professor(a)"])
  departmentStartDate?: string; // Data de entrada no departamento atual
  leaderDepartment?: string;
  
  // Consecration
  consecratedTo?: string;
  consecrationDate?: string;
  
  // History
  ministerialHistory?: MinisterialEvent[];
  
  // Metadata
  photoUrl?: string;
  validUntil: string;
  lastUpdated: string;
  consentGiven?: boolean;
  aceitou_politica?: boolean;
  data_aceite?: string;
  ip_aceite?: string;
  data_recusa?: string;
}

export const ALL_DEPT_ROLES = [
  'Integrante',
  'Líder',
  'Vice-Líder',
  'Coordenador',
  'Regente',
  'Professor(a)',
  'Secretário(a)',
  'Auxiliar'
] as const;

export type DeptRole = typeof ALL_DEPT_ROLES[number];

export const LEADERSHIP_ROLES = [
  'Líder',
  'Vice-Líder',
  'Coordenador',
  'Regente',
  'Professor(a)',
  'Secretário(a)',
  'Auxiliar'
] as const;

export type LeadershipRole = typeof LEADERSHIP_ROLES[number];

/**
 * Normaliza o valor de função de um departamento para uma lista de strings.
 * Aceita tanto o formato legado (string única como "Líder") quanto o novo (string[] como ["Líder", "Professor(a)"]).
 */
export function normalizeDeptRoleList(roleValue: unknown): string[] {
  if (!roleValue) return ['Integrante'];
  if (Array.isArray(roleValue)) {
    const valid = roleValue.map(r => String(r).trim()).filter(Boolean);
    return valid.length > 0 ? valid : ['Integrante'];
  }
  if (typeof roleValue === 'string') {
    const trimmed = roleValue.trim();
    return trimmed ? [trimmed] : ['Integrante'];
  }
  return ['Integrante'];
}

export const DEPARTMENTS = [
  'Dep. The Search',
  'Dep. Líderes',
  'Dep. Secretaria',
  'Dep. Mídia',
  'Dep. Músicos',
  'Dep. Rosas de Saron',
  'Dep. Evangelismo',
  'Dep. Tesouraria',
  'Dep. Louvor',
  'Dep. Técnico/Som',
  'Dep. Obreiros',
  'Dep. Recepção',
  'Dep. Escola Bíblica Dominical',
  'Dep. Acolhimento',
  'Dep. Ele Vem',
  'Dep. Cordeirinhos',
  'Nenhum Departamento'
];

export const CHILD_DEPARTMENTS = [
  'Nenhum Departamento',
  'Dep. Ele Vem',
  'Dep. Cordeirinhos',
  'Dep. The Search'
];

/**
 * Normaliza grafias legadas de departamentos para compatibilidade retroativa com dados anteriores.
 * Trata grafias antigas como equivalentes às novas grafias canônicas.
 *
 * Legados mapeados:
 *   'Dep. Corderinhos'          -> 'Dep. Cordeirinhos'
 *   'Dep. Som/Tecnica'          -> 'Dep. Técnico/Som'
 *   'Dep. Som/Técnica'          -> 'Dep. Técnico/Som'
 *   'Dep. Escola Biblica Dominical' -> 'Dep. Escola Bíblica Dominical'
 *   'Dep. Lideres'              -> 'Dep. Líderes'
 */
export const normalizeLegacyDept = (dept?: string | null): string => {
  if (!dept || typeof dept !== 'string') return '';
  const trimmed = dept.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'dep. corderinhos') return 'Dep. Cordeirinhos';
  if (lower === 'dep. som/tecnica' || lower === 'dep. som/técnica') return 'Dep. Técnico/Som';
  if (lower === 'dep. escola biblica dominical') return 'Dep. Escola Bíblica Dominical';
  if (lower === 'dep. lideres') return 'Dep. Líderes';
  return trimmed;
};

export const CONSECRATIONS = [
  'Obreiro',
  'Obreira',
  'Diacono',
  'Diaconisa',
  'Missionário',
  'Missionária',
  'Presbitero',
  'Evangelista',
  'Pastor',
  'Pastora'
];

export const POSITIONS = [
  'Membro',
  'Cooperador',
  'Obreiro',
  'Diácono',
  'Diaconisa',
  'Presbítero',
  'Evangelista',
  'Missionário',
  'Missionária',
  'Pastor'
];

export const BRAZILIAN_STATES = [
  'Acre - AC',
  'Alagoas - AL',
  'Amapá - AP',
  'Amazonas - AM',
  'Bahia - BA',
  'Brasília - DF',
  'Ceará - CE',
  'Espírito Santo - ES',
  'Goiás - GO',
  'Maranhão - MA',
  'Mato Grosso - MT',
  'Mato Grosso do Sul - MS',
  'Minas Gerais - MG',
  'Pará - PA',
  'Paraíba - PB',
  'Paraná - PR',
  'Pernambuco - PE',
  'Piauí - PI',
  'Rio de Janeiro - RJ',
  'Rio Grande do Norte - RN',
  'Rio Grande do Sul - RS',
  'Rondônia - RO',
  'Roraima - RR',
  'Santa Catarina - SC',
  'São Paulo - SP',
  'Sergipe - SE',
  'Tocantins - TO'
] as const;

export const ALL_COUNTRIES = [
  'Brasil',
  'Afeganistão',
  'África do Sul',
  'Albânia',
  'Alemanha',
  'Andorra',
  'Angola',
  'Antígua e Barbuda',
  'Arábia Saudita',
  'Argélia',
  'Argentina',
  'Armênia',
  'Austrália',
  'Áustria',
  'Azerbaijão',
  'Bahamas',
  'Bahrein',
  'Bangladesh',
  'Barbados',
  'Bélgica',
  'Belize',
  'Benin',
  'Bielorrússia',
  'Bolívia',
  'Bósnia e Herzegovina',
  'Botsuana',
  'Brunei',
  'Bulgária',
  'Burkina Faso',
  'Burundi',
  'Butão',
  'Cabo Verde',
  'Camarões',
  'Camboja',
  'Canadá',
  'Catar',
  'Cazaquistão',
  'Chade',
  'Chile',
  'China',
  'Chipre',
  'Colômbia',
  'Comores',
  'Congo-Brazzaville',
  'Congo-Kinshasa',
  'Coreia do Norte',
  'Coreia do Sul',
  'Costa do Marfim',
  'Costa Rica',
  'Croácia',
  'Cuba',
  'Dinamarca',
  'Djibuti',
  'Dominica',
  'Egito',
  'El Salvador',
  'Emirados Árabes Unidos',
  'Equador',
  'Eritreia',
  'Eslováquia',
  'Eslovênia',
  'Espanha',
  'Estados Unidos',
  'Estônia',
  'Eswatini',
  'Etiópia',
  'Fiji',
  'Filipinas',
  'Finlândia',
  'França',
  'Gabão',
  'Gâmbia',
  'Gana',
  'Geórgia',
  'Granada',
  'Grécia',
  'Guatemala',
  'Guiana',
  'Guiné',
  'Guiné Equatorial',
  'Guiné-Bissau',
  'Haiti',
  'Holanda (Países Baixos)',
  'Honduras',
  'Hungria',
  'Iêmen',
  'Ilhas Marshall',
  'Ilhas Salomão',
  'Índia',
  'Indonésia',
  'Irã',
  'Iraque',
  'Irlanda',
  'Islândia',
  'Israel',
  'Itália',
  'Jamaica',
  'Japão',
  'Jordânia',
  'Kuaite',
  'Laos',
  'Lesoto',
  'Letônia',
  'Líbano',
  'Libéria',
  'Líbia',
  'Liechtenstein',
  'Lituânia',
  'Luxemburgo',
  'Macedônia do Norte',
  'Madagascar',
  'Malásia',
  'Malauí',
  'Maldivas',
  'Mali',
  'Malta',
  'Marrocos',
  'Maurícia',
  'Mauritânia',
  'México',
  'Mianmar',
  'Micronésia',
  'Moçambique',
  'Moldávia',
  'Mônaco',
  'Mongólia',
  'Montenegro',
  'Namíbia',
  'Nauru',
  'Nepal',
  'Nicarágua',
  'Níger',
  'Nigéria',
  'Noruega',
  'Nova Zelândia',
  'Omã',
  'Palau',
  'Panamá',
  'Papua-Nova Guiné',
  'Paquistão',
  'Paraguai',
  'Peru',
  'Polônia',
  'Portugal',
  'Quênia',
  'Quirguistão',
  'Quiribati',
  'Reino Unido',
  'República Centro-Africana',
  'República Checa',
  'República Dominicana',
  'Romênia',
  'Ruanda',
  'Rússia',
  'Samoa',
  'San Marino',
  'Santa Lúcia',
  'São Cristóvão e Neves',
  'São Tomé e Príncipe',
  'São Vicente e Granadinas',
  'Seicheles',
  'Senegal',
  'Serra Leoa',
  'Sérvia',
  'Singapura',
  'Síria',
  'Somália',
  'Sri Lanka',
  'Sudão',
  'Sudão do Sul',
  'Suécia',
  'Suíça',
  'Suriname',
  'Tailândia',
  'Taiwan',
  'Tajiquistão',
  'Tanzânia',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad e Tobago',
  'Tunísia',
  'Turcomenistão',
  'Turquia',
  'Tuvalu',
  'Ucrânia',
  'Uganda',
  'Uruguai',
  'Uzbequistão',
  'Vanuatu',
  'Vaticano',
  'Venezuela',
  'Vietnã',
  'Zâmbia',
  'Zimbábue',
  'Outro'
] as const;


