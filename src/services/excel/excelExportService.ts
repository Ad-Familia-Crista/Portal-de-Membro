import ExcelJS from 'exceljs';
import { 
  ExcelExportOptions, 
  MultiSectionExcelExportOptions, 
  CellAlignmentType 
} from './excelTypes';
import { 
  HEADER_STYLE, 
  DATA_ROW_STYLE, 
  SECTION_HEADER_STYLE, 
  TITLE_STYLE, 
  SUBTITLE_STYLE, 
  DISCRETE_BORDER,
  EXCEL_FONT_FAMILY
} from './excelStyles';

/**
 * Faz o download de um buffer como arquivo .xlsx no navegador
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', cleanFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formata um valor garantindo que identificadores (CPF, telefone, CEP)
 * permaneçam como texto puro, preservando zeros à esquerda e sem notação científica.
 */
function sanitizeCellValue(val: any, dataType?: string): any {
  if (val === null || val === undefined) return '';

  if (dataType === 'number') {
    const num = Number(val);
    return isNaN(num) ? val : num;
  }

  // Se for string ou não especificado, converter com segurança
  const str = String(val).trim();
  return str;
}

/**
 * Calcula largura ótima da coluna baseado no conteúdo e cabeçalho
 */
function calculateColumnWidth(headerText: string, values: string[], customWidth?: number): number {
  if (customWidth) return customWidth;

  const headerLen = headerText.length;
  let maxContentLen = 0;

  for (const v of values) {
    if (v && v.length > maxContentLen) {
      maxContentLen = v.length;
    }
  }

  const calculated = Math.max(headerLen, maxContentLen) + 4;
  // Limites: mínimo 12, máximo 45
  return Math.min(Math.max(calculated, 12), 45);
}

/**
 * Exporta uma tabela estruturada de dados para arquivo Excel (.xlsx) com padrão visual ADFC
 */
export async function exportTableToExcel<T = any>(options: ExcelExportOptions<T>): Promise<void> {
  const {
    fileName,
    sheetName = 'Relatório',
    columns,
    data,
    autoFilter = true,
    freezeHeader = true,
    hideGridLines = true,
    title,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal de Membro ADFC';
  workbook.lastModifiedBy = 'Portal de Membro ADFC';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [
      {
        state: freezeHeader ? 'frozen' : 'normal',
        xSplit: 0,
        ySplit: freezeHeader ? (title ? 2 : 1) : 0,
        showGridLines: !hideGridLines, // Oculta linhas de grade para fundo branco puro
      },
    ],
  });

  let currentLine = 1;

  // 1. Título opcional
  if (title) {
    const titleRow = worksheet.getRow(currentLine);
    titleRow.values = [title];
    titleRow.height = TITLE_STYLE.height;
    
    const titleCell = titleRow.getCell(1);
    titleCell.font = TITLE_STYLE.font;
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

    currentLine++;
  }

  const headerRowIndex = currentLine;

  // 2. Linha de Cabeçalho
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = HEADER_STYLE.height;
  headerRow.values = columns.map(c => c.header);

  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.font = HEADER_STYLE.font;
    cell.fill = HEADER_STYLE.fill;
    cell.alignment = { 
      horizontal: col.alignment === 'right' ? 'right' : col.alignment === 'center' ? 'center' : 'left', 
      vertical: 'middle' 
    };
  });

  currentLine++;

  // 3. Linhas de Dados
  const columnSampleValues: string[][] = columns.map(() => []);

  data.forEach((item, rowIndex) => {
    const row = worksheet.getRow(currentLine + rowIndex);
    row.height = DATA_ROW_STYLE.height;

    const rowValues = columns.map((col, colIdx) => {
      let rawVal = col.formatter ? col.formatter(item, rowIndex) : (item as any)[col.key];
      const sanitized = sanitizeCellValue(rawVal, col.dataType);
      columnSampleValues[colIdx].push(String(sanitized));
      return sanitized;
    });

    row.values = rowValues;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.font = DATA_ROW_STYLE.font;
      cell.border = DISCRETE_BORDER;

      const align: CellAlignmentType = col.alignment || (col.dataType === 'number' ? 'right' : 'left');
      cell.alignment = { horizontal: align, vertical: 'middle' };

      // Se for identificador (CPF, CEP, telefone, etc.), garantir tipo string no Excel
      if (col.dataType === 'string' || typeof rowValues[colIdx] === 'string') {
        cell.numFmt = '@';
      }
    });
  });

  // 4. Ajustar larguras das colunas
  columns.forEach((col, colIdx) => {
    const calculatedWidth = calculateColumnWidth(col.header, columnSampleValues[colIdx], col.width);
    worksheet.getColumn(colIdx + 1).width = calculatedWidth;
  });

  // 5. Filtro automático no cabeçalho
  if (autoFilter && columns.length > 0) {
    worksheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: columns.length },
    };
  }

  await downloadWorkbook(workbook, fileName);
}

/**
 * Exporta relatórios com múltiplas seções / blocos de dados em uma única planilha
 * (utilizado nos relatórios gerenciais da igreja)
 */
export async function exportMultiSectionReport(options: MultiSectionExcelExportOptions): Promise<void> {
  const {
    fileName,
    sheetName = 'Relatório',
    title,
    subTitle,
    sections,
    hideGridLines = true,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal de Membro ADFC';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [
      {
        state: 'normal',
        showGridLines: !hideGridLines, // Oculta linhas de grade para fundo branco puro
      },
    ],
  });

  let currentRow = 1;

  // 1. Título principal
  if (title) {
    const titleRow = worksheet.getRow(currentRow);
    titleRow.values = [title];
    titleRow.height = TITLE_STYLE.height;
    const cell = titleRow.getCell(1);
    cell.font = TITLE_STYLE.font;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;
  }

  // 2. Subtítulo / Período
  if (subTitle) {
    const subRow = worksheet.getRow(currentRow);
    subRow.values = [subTitle];
    subRow.height = SUBTITLE_STYLE.height;
    const cell = subRow.getCell(1);
    cell.font = SUBTITLE_STYLE.font;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;
  }

  if (title || subTitle) {
    currentRow++; // Linha em branco para espaçamento visual
  }

  let maxColCount = 1;

  // 3. Renderizar cada seção
  for (const section of sections) {
    if (section.headers.length > maxColCount) {
      maxColCount = section.headers.length;
    }

    // Título da Seção
    if (section.title) {
      const sectionTitleRow = worksheet.getRow(currentRow);
      sectionTitleRow.values = [section.title];
      sectionTitleRow.height = SECTION_HEADER_STYLE.height;
      const cell = sectionTitleRow.getCell(1);
      cell.font = SECTION_HEADER_STYLE.font;
      cell.fill = SECTION_HEADER_STYLE.fill;
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      currentRow++;
    }

    // Cabeçalho da Seção
    if (section.headers.length > 0) {
      const headerRow = worksheet.getRow(currentRow);
      headerRow.values = section.headers;
      headerRow.height = HEADER_STYLE.height;

      section.headers.forEach((_, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.font = HEADER_STYLE.font;
        cell.fill = HEADER_STYLE.fill;
        const align = section.alignments?.[colIdx] || 'left';
        cell.alignment = { horizontal: align, vertical: 'middle' };
      });

      currentRow++;
    }

    // Linhas de dados da Seção
    for (const rowData of section.rows) {
      const row = worksheet.getRow(currentRow);
      row.values = rowData.map(v => sanitizeCellValue(v));
      row.height = DATA_ROW_STYLE.height;

      rowData.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.font = DATA_ROW_STYLE.font;
        cell.border = DISCRETE_BORDER;

        const align = section.alignments?.[colIdx] || (typeof val === 'number' ? 'right' : 'left');
        cell.alignment = { horizontal: align, vertical: 'middle' };

        if (typeof val === 'string') {
          cell.numFmt = '@';
        }
      });

      currentRow++;
    }

    currentRow++; // Espaço entre seções
  }

  // Ajuste geral de largura das colunas
  for (let c = 1; c <= maxColCount; c++) {
    worksheet.getColumn(c).width = 24;
  }

  await downloadWorkbook(workbook, fileName);
}
