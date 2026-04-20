import { isSameDay, getYear } from 'date-fns';

export interface Holiday {
  date: string; // ISO format YYYY-MM-DD
  name: string;
}

export function getNationalHolidays(year: number): Holiday[] {
  // Static holidays
  const holidays: Holiday[] = [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Consciência Negra' },
    { date: `${year}-12-25`, name: 'Natal' },
  ];

  // Movable holidays (simplified calculation for Brazil)
  // Pascoa, Carnaval, Sexta-feira Santa, Corpus Christi
  
  // Butcher's algorithm for Easter
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month - 1, day);
  
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  holidays.push({ date: formatDate(addDays(easter, -47)), name: 'Carnaval' });
  holidays.push({ date: formatDate(addDays(easter, -2)), name: 'Sexta-feira Santa' });
  holidays.push({ date: formatDate(addDays(easter, 60)), name: 'Corpus Christi' });

  return holidays;
}

export function isHoliday(date: Date | string): Holiday | null {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  const year = d.getFullYear();
  const holidays = getNationalHolidays(year);
  // Use local date parts to avoid UTC offset shifting the date
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const iso = `${year}-${mm}-${dd}`;
  return holidays.find(h => h.date === iso) || null;
}
