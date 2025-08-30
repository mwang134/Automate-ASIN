const OUTPUT_HEADERS = ['ASINs', 'ASIN_Status', 'Error_Message'];
const ANCHOR_HEADER = 'Product Details';
const ORDER_ID_HEADER = 'Order ID';
const BACKEND_URL = 'https://2ace4d305247.ngrok-free.app/fill-asins';
const API_KEY = PropertiesService.getScriptProperties().getProperty('BACKEND_API_KEY') || '';


function onOpen(e) {

  const ui = SpreadsheetApp.getUi();

  ui.createMenu('ASIN Tools')
    .addItem('Fill Selected (test)', 'fillSelected')
    .addToUi();
}

function writeErrorToSelection_(sheet, headerMap, start, end, message) {
  if (!headerMap['Error_Message']) return;
  for (let r = start; r <= end; r++) {
    sheet.getRange(r, headerMap['Error_Message']).setValue(message);
  }
}

function fillSelected() {

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getActiveSheet();
  const rng = sheet.getActiveRange();

  if (!rng) {

    ss.toast('Select some rows first', 'ASIN Tools', 4);
    return;
  }

  //Make sure to not highlight the very first row
  const start = Math.max(rng.getRow(), 2);
  const end = rng.getRow() + rng.getNumRows() - 1;             

  //Fill in any empty header lines
  const col = insertOutputHeaders(ss, sheet);      

  const orderIds = [];

  // Collect IDs
  for (let r = start; r <= end; r++) {  

    const oid = String(sheet.getRange(r, col[ORDER_ID_HEADER]).getValue() || '').trim(); 
    if (oid) {

      orderIds.push(oid);
    }                                   
  }

  if (!orderIds.length) { 

    ss.toast('No Order ID values in selection', 'ASIN Tools', 4); 
    
    return; 
  }

  let data;

  // call backend with selected ID
  try {
    
    const headers = { 'Content-Type': 'application/json' };
    
    if (API_KEY) {
      
      headers['BACKEND_API_KEY'] = API_KEY;
    } 

    const res = UrlFetchApp.fetch(BACKEND_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ orderIds: Array.from(new Set(orderIds)) }),
      headers,
      muteHttpExceptions: true          // keep
    });

    const body = res.getContentText(); 

    if (res.getResponseCode() < 200 || res.getResponseCode() > 299) {
      
      Logger.log(`Backend ${res.getResponseCode()} body: ${body}`); 
      ss.toast(`Backend ${res.getResponseCode()}`, 'ASIN Tools', 5);
      writeErrorToSelection_(sheet, col, start, end, `HTTP ${res.getResponseCode()}: ${body.slice(0, 300)}`);
      return;
    }

    data = JSON.parse(body);
  } catch (e) {
    Logger.log(e);
    ss.toast(`Request failed: ${e}`, 'ASIN Tools', 5);
    writeErrorToSelection_(sheet, col, start, end, `Fetch error: ${e}`); 
    return;
  }

  // map results by orderId and write cells
  const mapById = {};
  (data.results || []).forEach(x => { mapById[String(x.orderId)] = x; });

  let filled = 0;

  for (let r = start; r <= end; r++) {

    const oid = String(sheet.getRange(r, col[ORDER_ID_HEADER]).getValue() || '').trim();

    if (!oid) {

      continue;
    } 

    const map = mapById[oid];

    if (!map) {

      sheet.getRange(r, col['ASIN_Status']).setValue('NOT_FOUND');
      sheet.getRange(r, col['Error_Message']).setValue('No result from backend');
      continue;
    }

    sheet.getRange(r, col['ASINs']).setValue(map.asins || '');
    sheet.getRange(r, col['ASIN_Status']).setValue(map.status || '');
    sheet.getRange(r, col['Error_Message']).setValue(map.error || '');
    filled++;
  }

  ss.toast(`Filled ${filled} row(s)`, 'ASIN Tools', 3);
}

// Inserts any empty column with header lines
function insertOutputHeaders(ss, sheet) {

  // reads first header row
  const lastCol = sheet.getLastColumn() || 2; 
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const anchorIndex = headers.indexOf(ANCHOR_HEADER);

  if (anchorIndex === -1) {

    ss.toast(`Add a header named ${ANCHOR_HEADER} in row 1`, 'ASIN Tools', 4);

    throw new Error('Anchor header not found');
  }

  let offset = 1; 

  for (let i = 0; i < OUTPUT_HEADERS.length; i++) {
    
    if (headers.indexOf(OUTPUT_HEADERS[i]) === -1) {

      sheet.insertColumnAfter(anchorIndex + offset);        
      sheet.getRange(1, anchorIndex + offset + 1).setValue(OUTPUT_HEADERS[i]);
    }
    offset++; 
  }

  // Build a look-up
  const hdrs = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = {};

  hdrs.forEach((h, i) => { col[h] = i + 1; });

  return col;
}
