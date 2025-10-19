import type { CreateSessionDTO } from '@/types/database';

export interface CSVRow {
  [key: string]: string; // Allow for any columns
}

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 3) {
    throw new Error('CSV file is empty or invalid');
  }

  // Skip first line if it's a title (starts with "--")
  let headerIndex = 0;
  if (lines[0].includes('---')) {
    headerIndex = 1;
  }

  // Parse header - handle quoted CSV properly
  const headerLine = lines[headerIndex];
  const headers = parseCSVLine(headerLine);

  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.warn(`Skipping row ${i + 1}: column count mismatch (expected ${headers.length}, got ${values.length})`);
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

export function mapCSVRowToSession(row: CSVRow, userId: string): CreateSessionDTO {
  // Parse date from PBT format: "2025-10-16 20:52:34"
  let sessionDate: string;
  let actualStartTime: string | undefined;
  let actualEndTime: string | undefined;

  if (row.starttime) {
    const startDate = new Date(row.starttime);
    sessionDate = startDate.toISOString().split('T')[0];
    actualStartTime = startDate.toISOString();
  } else {
    sessionDate = new Date().toISOString().split('T')[0];
  }

  if (row.endtime) {
    actualEndTime = new Date(row.endtime).toISOString();
  }

  // Parse game type from "variant" column (Cash Game, Tournament, etc.)
  let gameType: 'cash' | 'tournament' | 'sng' = 'cash';
  const variant = row.variant?.toLowerCase() || '';

  if (variant.includes('tournament') || variant.includes('mtt')) {
    gameType = 'tournament';
  } else if (variant.includes('sng') || variant.includes('sit')) {
    gameType = 'sng';
  }

  // Parse variant from "game" column (Holdem, Omaha, etc.) and "limit" column
  const game = row.game?.toLowerCase() || '';
  const limit = row.limit?.toLowerCase() || '';

  let variantCode = 'nlhe';
  if (game.includes('hold')) {
    variantCode = limit.includes('no limit') ? 'nlhe' : 'lhe';
  } else if (game.includes('omaha')) {
    variantCode = limit.includes('pot') ? 'plo' : 'omaha';
  }

  // Parse financial data
  const buyIn = parseFloat(row.buyin || '0');
  const cashOut = parseFloat(row.cashout || '0');
  const rebuys = parseFloat(row.rebuys || '0');
  const rebuyCosts = parseFloat(row.rebuycosts || '0');

  // Build stakes from blinds
  let stakes: string | undefined;
  if (row.smallblind && row.bigblind) {
    const sb = parseFloat(row.smallblind);
    const bb = parseFloat(row.bigblind);
    if (sb > 0 || bb > 0) {
      stakes = `${sb}/${bb}`;
    }
  }

  // Determine location type
  const location = row.location || '';
  const locationType: 'live' | 'online' = row.type?.toLowerCase() === 'online' ? 'online' : 'live';

  // Calculate duration in hours
  let duration: number | undefined;
  if (row.playingminutes) {
    duration = parseFloat(row.playingminutes) / 60;
  }

  // Parse notes from sessionnote field
  let notes = '';
  if (row.sessionnote) {
    notes = row.sessionnote;
  }
  if (row.notes) {
    notes = notes ? `${notes}\n\nOriginal notes: ${row.notes}` : row.notes;
  }
  notes = notes || 'Imported from PBT Bankroll';

  return {
    session_date: sessionDate,
    game_type: gameType,
    variant: variantCode,
    stakes: stakes,
    location: location || undefined,
    location_type: locationType,
    buy_in: buyIn,
    cash_out: cashOut,
    is_ongoing: false,
    actual_start_time: actualStartTime,
    actual_end_time: actualEndTime,
    duration_hours: duration,
    total_rebuys: rebuyCosts,
    rebuy_count: parseInt(row.rebuys || '0'),
    notes: notes,
  };
}

export async function importSessionsFromCSV(
  csvText: string,
  userId: string
): Promise<{ success: CreateSessionDTO[]; errors: string[] }> {
  const success: CreateSessionDTO[] = [];
  const errors: string[] = [];

  try {
    const rows = parseCSV(csvText);

    for (let i = 0; i < rows.length; i++) {
      try {
        const session = mapCSVRowToSession(rows[i], userId);
        success.push(session);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`CSV parsing error: ${error.message}`);
  }

  return { success, errors };
}
