// functions/apartments.js
// Fetches apartment listings from a public Google Sheet (CSV export)

exports.handler = async function (event, context) {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID; // set in Netlify env vars
  const SHEET_GID = process.env.GOOGLE_SHEET_GID || '0'; // tab GID, default first tab

  if (!SHEET_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GOOGLE_SHEET_ID environment variable not set.' }),
    };
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}. Make sure the sheet is published publicly.`);
    }
    const csv = await response.text();
    const apartments = parseCSV(csv);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(apartments),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  return lines.slice(1)
    .map((line, i) => {
      const values = parseCSVRow(line);
      const row = {};
      headers.forEach((h, j) => { row[h] = (values[j] || '').trim(); });

      // Skip empty rows
      if (!row.name && !row.address) return null;

      return {
        id: row.id || `apt-${i + 1}`,
        name: row.name || '',
        address: row.address || '',
        price: row.price || '',
        rooms: row.rooms || '',
        size: row.size || null,
        available: row.available || '',
        lease: row.lease || '',
        amenities: row.amenities ? row.amenities.split('|').map(a => a.trim()) : [],
        pets: row.pets || '',
        parking: row.parking || '',
        description: row.description || '',
        moveInBonus: row.move_in_bonus || null,
      };
    })
    .filter(Boolean);
}

// Handles quoted fields with commas inside them
function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
