import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import db from '../database/db';

export function importPlayersFromExcel(): { total: number, imported: number, skipped: number, errors: number } {
  const possiblePaths = [
    path.resolve(__dirname, '../../../../Player List/IPL_2026_Auction_Player_List.xlsx'),
    path.resolve(__dirname, '../../../Player List/IPL_2026_Auction_Player_List.xlsx'),
    path.resolve(process.cwd(), '../Player List/IPL_2026_Auction_Player_List.xlsx'),
    path.resolve(process.cwd(), '../../Player List/IPL_2026_Auction_Player_List.xlsx'),
    path.resolve(process.cwd(), 'Player List/IPL_2026_Auction_Player_List.xlsx')
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error('Failed to locate Excel file in any candidate path:', possiblePaths);
    return { total: 0, imported: 0, skipped: 0, errors: 1 };
  }

  let workbook;
  try {
    workbook = xlsx.readFile(filePath);
  } catch (error) {
    console.error('Failed to read Excel file:', error);
    return { total: 0, imported: 0, skipped: 0, errors: 1 };
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet) as any[];

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO players (
      id, player_name, primary_role, country, status,
      franchise_2026, squad_status, base_price_lakhs, game_points, auction_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')
  `);

  const tx = db.transaction((playersData) => {
    for (const row of playersData) {
      try {
        const id = row['Player ID'];
        const name = row['Player Name'];
        const role = row['Primary Role'];
        const country = row['Country'];
        const status = row['Status'];
        const franchise = row['2026 Franchise'] || null;
        const squadStatus = row['Squad Status'] || null;
        const basePrice = Math.round(parseFloat(row['Game Base Price (₹ Cr)']) * 100);
        const gamePoints = parseInt(row['Game Points (1–15)'], 10);

        if (!id || !name || !role || !country || !status || isNaN(basePrice) || isNaN(gamePoints)) {
          errors++;
          continue;
        }

        const info = insertStmt.run(id, name, role, country, status, franchise, squadStatus, basePrice, gamePoints);
        if (info.changes > 0) {
          imported++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors++;
      }
    }
  });

  tx(data);

  return { total: data.length, imported, skipped, errors };
}
