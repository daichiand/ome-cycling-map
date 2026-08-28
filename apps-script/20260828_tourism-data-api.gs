/**
 * 「スポット管理」シートの公開行だけを、車観光マップ向けJSONとして返します。
 * このコードは、新しいGoogle Sheetsで [拡張機能] > [Apps Script] に貼り付けて使います。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('地図管理')
    .addItem('住所から座標を取得', 'geocodeMarkedRows')
    .addToUi();
}

/** 初回設定用: 座標取得列と入力候補を整えます。 */
function setupGeocodeColumn() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const spotSheet = spreadsheet.getSheetByName('スポット管理');
  const optionSheet = spreadsheet.getSheetByName('選択肢');
  if (!spotSheet || !optionSheet) throw new Error('スポット管理または選択肢シートが見つかりません。');
  spotSheet.getRange(1, 21).setValue('座標取得');
  optionSheet.getRange(1, 4, 5, 1).setValues([
    ['座標取得'], ['取得'], ['完了'], ['該当なし'], ['住所要確認']
  ]);
}

/**
 * 「座標取得」列に「取得」と入力した行だけ、住所から緯度・経度を入力します。
 * 実行後は結果を「完了」「該当なし」「住所要確認」として同じ列へ記録します。
 */
function geocodeMarkedRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('スポット管理');
  if (!sheet) throw new Error('スポット管理シートが見つかりません。');
  const values = sheet.getDataRange().getDisplayValues();
  const headerIndex = values.findIndex((row) => row[0] === 'spot_id');
  if (headerIndex < 0) throw new Error('ヘッダー行が見つかりません。');
  const headers = values[headerIndex];
  const indexOf = (name) => headers.indexOf(name);
  const addressIndex = indexOf('住所');
  const latIndex = indexOf('緯度');
  const lngIndex = indexOf('経度');
  const requestIndex = indexOf('座標取得');
  if ([addressIndex, latIndex, lngIndex, requestIndex].some((index) => index < 0)) {
    throw new Error('住所・緯度・経度・座標取得の列が必要です。');
  }

  let completed = 0;
  let failed = 0;
  values.slice(headerIndex + 1).forEach((row, offset) => {
    if (row[requestIndex] !== '取得') return;
    const rowNumber = headerIndex + offset + 2;
    const address = row[addressIndex].trim();
    const statusCell = sheet.getRange(rowNumber, requestIndex + 1);
    if (!address || address === '要確認') {
      statusCell.setValue('住所要確認');
      failed += 1;
      return;
    }
    const results = Maps.newGeocoder().setLanguage('ja').geocode(address);
    if (!results || !results.length) {
      statusCell.setValue('該当なし');
      failed += 1;
      return;
    }
    const location = results[0].geometry.location;
    sheet.getRange(rowNumber, latIndex + 1).setValue(location.lat);
    sheet.getRange(rowNumber, lngIndex + 1).setValue(location.lng);
    statusCell.setValue('完了');
    completed += 1;
  });
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `成功: ${completed}件 / 確認が必要: ${failed}件`,
    '座標取得が完了しました',
    8
  );
}

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
