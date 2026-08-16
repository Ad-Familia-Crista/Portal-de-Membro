export type UserRole = 'MEMBER' | 'RECEPTION' | 'SECRETARY' | 'ADMIN';

export interface WorshipFrequency {
  id: string;
  cultDate: string; // Formato YYYY-MM-DD
  theme: 'Culto de Primícias' | 'Culto de Missões' | 'Culto de Santa Ceia' | 'Culto da Família' | 'Culto Minha Família no Altar do Senhor' | 'Culto da Vitória';
  totalAttendance: number;
  visitorsAttendance: number;
  childrenAttendance: number; // Novo campo
  membersAttendance: number; // Campo Calculado no front: totalAttendance - (visitorsAttendance + childrenAttendance)
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

export const CULT_THEMES = [
  'Culto de Primícias',
  'Culto de Missões',
  'Culto de Santa Ceia',
  'Culto da Família',
  'Culto Minha Família no Altar do Senhor',
  'Culto da Vitória'
] as const;

export interface Child {
  name: string;
  cpf: string;
  birthDate: string;
  congregates?: 'Sim' | 'Não' | string;
  departments?: string[];
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
  leaderDepartment?: string;
  
  // Consecration
  consecratedTo?: string;
  consecrationDate?: string;
  
  // History
  ministerialHistory: MinisterialEvent[];
  
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

export const DEPARTMENTS = [
  'Departamento de Jovens – The Search',
  'Departamento Irmãs - Rosas de Saron',
  'Departamento de Obreiros (Cooperadores)',
  'Departamento de Líderes',
  'Evangelismo',
  'Escola Bíblica Dominical',
  'Secretariado',
  'Tesouraria',
  'Recepção',
  'Mídia',
  'Sonoplastia e Slide',
  'Nenhum'
];

export const CHILD_DEPARTMENTS = [
  'Departamento da Adolescência',
  'Departamento Infantil – Cordeirinhos',
  'Departamento de Jovens – The Search'
];

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
  'Obreiro',
  'Diácono',
  'Presbítero',
  'Evangelista',
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

