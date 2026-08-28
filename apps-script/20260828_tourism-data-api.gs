/**
 * 「スポット管理」シートの公開行だけを、車観光マップ向けJSONとして返します。
 * このコードは、新しいGoogle Sheetsで [拡張機能] > [Apps Script] に貼り付けて使います。
 */
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('スポット管理');
  if (!sheet) return json({ error: 'スポット管理シートが見つかりません。' });
  const values = sheet.getDataRange().getDisplayValues();
  const headerIndex = values.findIndex((row) => row[0] === 'spot_id');
  if (headerIndex < 0) return json({ error: 'ヘッダー行が見つかりません。' });
  const headers = values[headerIndex];
  const spots = values.slice(headerIndex + 1)
    .filter((row) => row[0] && row[1] === '公開')
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
    .map((row) => ({
      id: row.spot_id, public: true, isSample: row['サンプル'] === 'はい',
      name: row['スポット名'], category: row['カテゴリ'], description: row['説明'],
      lat: Number(row['緯度']), lng: Number(row['経度']), address: row['住所'],
      businessHours: row['営業時間'], closedDays: row['定休日'], parkingAvailable: row['駐車場'],
      parkingDetails: row['駐車場詳細'], carAccess: row['車アクセス'], website: row['公式サイト'],
      phone: row['電話番号'], tags: row['タグ'].split(/[,、]/).map((tag) => tag.trim()).filter(Boolean),
      imageUrl: row['画像URL'], updatedAt: row['更新日']
    }))
    .filter((spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng));
  return json({ version: 1, generatedAt: new Date().toISOString(), spots });
}
function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
