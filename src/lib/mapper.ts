/**
 * Utilitário de mapeamento para converter entre o formato de banco de dados (snake_case)
 * e o formato do frontend (camelCase).
 */

const FIELD_MAPPING: Record<string, string> = {
  // Auth & Status
  firstName: 'first_name',
  lastName: 'last_name',
  birthDate: 'birth_date',
  maritalStatus: 'marital_status',
  marriageDate: 'marriage_date',
  spouseName: 'spouse_name',
  hasChildren: 'has_children',
  
  // Espiritual
  isBaptized: 'is_baptized',
  baptismChurch: 'baptism_church',
  baptismDate: 'baptism_date',
  isHolySpiritBaptized: 'is_holy_spirit_baptized',
  entryDate: 'entry_date',
  previousChurch: 'previous_church',
  participatesInConvention: 'participates_in_convention',
  conventionName: 'convention_name',
  receivedAs: 'received_as',
  
  // Ministerial
  currentPosition: 'current_position',
  positionStartDate: 'position_start_date',
  leaderDepartment: 'leader_department',
  consecratedTo: 'consecrated_to',
  consecrationDate: 'consecration_date',
  ministerialHistory: 'ministerial_history',
  
  // Metadata & LGPD
  photoUrl: 'photo_url',
  validUntil: 'valid_until',
  lastUpdated: 'last_updated',
  consentGiven: 'consent_given',
  
  // Frequência de Cultos
  cultDate: 'cult_date',
  totalAttendance: 'total_attendance',
  visitorsAttendance: 'visitors_attendance',
  childrenAttendance: 'children_attendance',
  
  // Mural de Avisos (Announcements)
  dateInfo: 'date_info',
  startDate: 'start_date',
  endDate: 'end_date'
};

// Inverte o mapeamento para converter de snake -> camel
const REVERSE_MAPPING: Record<string, string> = Object.entries(FIELD_MAPPING).reduce(
  (acc, [camel, snake]) => ({ ...acc, [snake]: camel }),
  {}
);

/**
 * Converte um objeto camelCase para snake_case para envio ao banco.
 */
export const toSnake = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  
  const snakeData: any = {};
  Object.keys(data).forEach(key => {
    const dbKey = FIELD_MAPPING[key] || key;
    snakeData[dbKey] = data[key];
  });
  return snakeData;
};

/**
 * Converte um objeto snake_case do banco para camelCase para uso no frontend.
 */
export const toCamel = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(toCamel);
  
  const camelData: any = {};
  Object.keys(data).forEach(key => {
    const uiKey = REVERSE_MAPPING[key] || key;
    camelData[uiKey] = data[key];
  });
  return camelData;
};
