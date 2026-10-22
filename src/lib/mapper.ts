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
  departmentStartDate: 'department_start_date',
  leaderDepartment: 'leader_department',
  departmentRoles: 'department_roles',
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
  speaker: 'speaker',
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

  let rawRoles: Record<string, any> = {};
  if (typeof camelData.departmentRoles === 'string') {
    try {
      rawRoles = JSON.parse(camelData.departmentRoles);
    } catch {
      rawRoles = {};
    }
  } else if (camelData.departmentRoles && typeof camelData.departmentRoles === 'object') {
    rawRoles = camelData.departmentRoles;
  }

  // Normaliza cada entrada para string[] (suporta tanto string legado quanto string[] novo)
  const normalizedRoles: Record<string, string[]> = {};
  Object.entries(rawRoles).forEach(([dept, val]) => {
    if (Array.isArray(val)) {
      const valid = val.map((r: any) => String(r).trim()).filter(Boolean);
      normalizedRoles[dept] = valid.length > 0 ? valid : ['Integrante'];
    } else if (typeof val === 'string' && val.trim()) {
      normalizedRoles[dept] = [val.trim()];
    } else {
      normalizedRoles[dept] = ['Integrante'];
    }
  });

  // Sincronização bidirecional:
  // 1. Se departmentRoles não tiver liderança mas houver leaderDepartment legado
  const hasLeadershipInRoles = Object.values(normalizedRoles).some((roleList) =>
    roleList.some((r) => r && r !== 'Integrante' && r !== 'Membro')
  );

  if (!hasLeadershipInRoles && camelData.leaderDepartment && typeof camelData.leaderDepartment === 'string' && camelData.leaderDepartment.trim()) {
    const segments = camelData.leaderDepartment.split(',').map((s: string) => s.trim()).filter(Boolean);
    segments.forEach((seg: string) => {
      if (seg.includes('—') || seg.includes('-')) {
        const parts = seg.split(/[—\-]/);
        const role = parts[0]?.trim() || 'Líder';
        const dept = parts.slice(1).join(' - ').trim();
        if (dept) {
          const existing = (normalizedRoles[dept] || []).filter((r) => r !== 'Integrante' && r !== 'Membro');
          if (!existing.includes(role)) existing.push(role);
          normalizedRoles[dept] = existing.length > 0 ? existing : ['Integrante'];
        }
      } else {
        const existing = (normalizedRoles[seg] || []).filter((r) => r !== 'Integrante' && r !== 'Membro');
        if (!existing.includes('Líder')) existing.push('Líder');
        normalizedRoles[seg] = existing.length > 0 ? existing : ['Integrante'];
      }
    });
  }

  camelData.departmentRoles = normalizedRoles;

  // 2. Se leaderDepartment estiver vazio mas departmentRoles contiver liderança
  if ((!camelData.leaderDepartment || !camelData.leaderDepartment.trim()) && camelData.departmentRoles) {
    const leaders: string[] = [];
    Object.entries(normalizedRoles).forEach(([dept, roles]) => {
      roles
        .filter((r) => r && r !== 'Integrante' && r !== 'Membro')
        .forEach((r) => {
          leaders.push(`${r} - ${dept}`);
        });
    });
    if (leaders.length > 0) {
      camelData.leaderDepartment = leaders.join(', ');
    }
  }

  return camelData;
};
