export type CellAlignmentType = 'left' | 'center' | 'right';
export type CellDataType = 'string' | 'number' | 'date';

export interface ExcelColumnDefinition<T = any> {
  header: string;
  key: string;
  width?: number;
  alignment?: CellAlignmentType;
  dataType?: CellDataType;
  /** Função de formatação customizada para extrair o valor do objeto */
  formatter?: (row: T, index: number) => any;
}

export interface ExcelExportOptions<T = any> {
  fileName: string;
  sheetName?: string;
  columns: ExcelColumnDefinition<T>[];
  data: T[];
  /** Se deve aplicar autoFilter no cabeçalho. Padrão: true */
  autoFilter?: boolean;
  /** Se deve congelar a linha do cabeçalho. Padrão: true */
  freezeHeader?: boolean;
  /** Ocultar linhas de grade do Excel para fundo branco limpo. Padrão: true */
  hideGridLines?: boolean;
  /** Título opcional exibido no topo da planilha */
  title?: string;
}

export interface MultiSectionSheetSection {
  title?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  alignments?: CellAlignmentType[];
  colWidths?: number[];
}

export interface MultiSectionExcelExportOptions {
  fileName: string;
  sheetName?: string;
  title?: string;
  subTitle?: string;
  sections: MultiSectionSheetSection[];
  hideGridLines?: boolean;
}
