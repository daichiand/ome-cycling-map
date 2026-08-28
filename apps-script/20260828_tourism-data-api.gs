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
 * 初回移植用: 「移植用シート」の来訪者向け候補だけを下書きとして取り込みます。
 * 既存のサンプル行を置き換えます。サンプル以外の行がある場合は安全のため停止します。
 */
function importInitialTourismCandidates() {
  const sourceSpreadsheetId = '1ciDVLxmpwRhU4MT4lrVsTbxCe5mrQjyszSX2fRneA1U';
  const sourceSheet = SpreadsheetApp.openById(sourceSpreadsheetId).getSheetByName('シート1');
  const targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('スポット管理');
  if (!sourceSheet || !targetSheet) throw new Error('移植元またはスポット管理シートが見つかりません。');

  const targetValues = targetSheet.getDataRange().getDisplayValues();
  const headerIndex = targetValues.findIndex((row) => row[0] === 'spot_id');
  if (headerIndex < 0) throw new Error('スポット管理のヘッダー行が見つかりません。');
  const headers = targetValues[headerIndex];
  const sampleIndex = headers.indexOf('サンプル');
  const existingNonSample = targetValues.slice(headerIndex + 1)
    .some((row) => row[0] && row[sampleIndex] !== 'はい');
  if (existingNonSample) {
    throw new Error('サンプル以外の既存行があるため、自動移植を停止しました。');
  }

  const sourceValues = sourceSheet.getDataRange().getDisplayValues();
  const candidates = sourceValues.slice(1)
    .map((row) => ({ districtNo: row[0], district: row[1], name: row[2], address: row[5] }))
    .filter((row) => row.name && row.address.startsWith('青梅市') && isTourismCandidate_(row.name));
  if (!candidates.length) throw new Error('移植候補が見つかりません。');

  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const rows = candidates.map((candidate, index) => {
    const record = {
      spot_id: 'ome-import-' + String(index + 1).padStart(3, '0'),
      公開状態: '下書き',
      サンプル: 'いいえ',
      スポット名: candidate.name,
      カテゴリ: inferTourismCategory_(candidate.name),
      説明: candidate.district + '地区の移植候補です。詳細情報を確認中です。',
      緯度: '',
      経度: '',
      住所: candidate.address,
      営業時間: '要確認',
      定休日: '要確認',
      駐車場: '要確認',
      駐車場詳細: '要確認',
      車アクセス: '要確認',
      公式サイト: '',
      電話番号: '',
      タグ: candidate.district + ',移植候補',
      画像URL: '',
      更新日: today,
      '情報源・確認メモ': '移植元: シート1 / 地区No ' + candidate.districtNo + '。公開前に公式情報を確認。',
      座標取得: '取得'
    };
    return headers.map((header) => record[header] || '');
  });

  const dataStartRow = headerIndex + 2;
  const existingRowCount = Math.max(targetSheet.getLastRow() - headerIndex - 1, 0);
  if (existingRowCount) targetSheet.getRange(dataStartRow, 1, existingRowCount, headers.length).clearContent();
  targetSheet.getRange(dataStartRow, 1, rows.length, headers.length).setValues(rows);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    rows.length + '件を下書きへ移植しました。',
    '初回移植が完了しました',
    8
  );
}

function isTourismCandidate_(name) {
  return /(神社|寺|観音|博物館|美術館|資料館|記念館|公園|温泉|観光|ギャラリー|café|カフェ|茶園|農園|果樹園|そば|ラーメン|食堂|寿司|菓子|製菓|酒店|醸造|クラフト|織物|染工|工房|体験|旅館|民宿|ホテル|キャンプ|鉄道|道の駅|市場|物産|会館)/i.test(name);
}

function inferTourismCategory_(name) {
  if (/(神社|寺|観音)/.test(name)) return '歴史';
  if (/(博物館|美術館|資料館|記念館|ギャラリー|織物|染工|鉄道|クラフト|会館)/i.test(name)) return '文化';
  if (/公園/.test(name)) return '公園';
  if (/温泉/.test(name)) return '温泉';
  if (/(茶園|農園|果樹園|工房|体験)/.test(name)) return '体験';
  if (/(カフェ|café|そば|ラーメン|食堂|寿司|菓子|製菓)/i.test(name)) return '飲食';
  if (/観光/.test(name)) return '観光拠点';
  return '買い物';
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
