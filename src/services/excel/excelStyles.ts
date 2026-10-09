import type { Borders, Fill, Font } from 'exceljs';

export const EXCEL_FONT_FAMILY = 'Arial';

export const HEADER_STYLE = {
  font: {
    name: EXCEL_FONT_FAMILY,
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }, // Branco puro
  } as Partial<Font>,
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }, // Grafite escuro elegante (alinhado à identidade ADFC)
  } as Fill,
  height: 28,
};

export const SECTION_HEADER_STYLE = {
  font: {
    name: EXCEL_FONT_FAMILY,
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  } as Partial<Font>,
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF374151' }, // Grafite intermediário
  } as Fill,
  height: 24,
};

export const TITLE_STYLE = {
  font: {
    name: EXCEL_FONT_FAMILY,
    size: 14,
    bold: true,
    color: { argb: 'FF111827' }, // Preto / grafite
  } as Partial<Font>,
  height: 30,
};

export const SUBTITLE_STYLE = {
  font: {
    name: EXCEL_FONT_FAMILY,
    size: 10,
    italic: true,
    color: { argb: 'FF4B5563' }, // Cinza escuro
  } as Partial<Font>,
  height: 20,
};

export const DATA_ROW_STYLE = {
  font: {
    name: EXCEL_FONT_FAMILY,
    size: 10,
    color: { argb: 'FF111827' },
  } as Partial<Font>,
  height: 21,
};

export const DISCRETE_BORDER: Partial<Borders> = {
  bottom: {
    style: 'thin',
    color: { argb: 'FFF3F4F6' }, // Borda inferior ultra-discreta para leitura
  },
};
