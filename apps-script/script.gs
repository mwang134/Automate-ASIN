const OUTPUT_HEADERS = ['ASINs', 'SKUs', 'Titles', 'Qty', 'ASIN_Status', 'Error_Message'];
const ANCHOR_HEADER = 'Product Details';
const ORDER_ID_HEADER = 'Order ID';

function onOpen(e) {

  const ui = SpreadsheetApp.getUi();

  ui.createMenu('ASIN Tools')
    .addItem('Fill Selected (test)', 'fillSelected')
    .addToUi();
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
  let filled = 0;

  //Test
  for (let i = start; i <= end; i++) {

    const orderId = sheet.getRange(i, col[ORDER_ID_HEADER]).getValue();
    
    if (!orderId) {

      continue;
    }

    sheet.getRange(i, col['ASINs']).setValue('0000000');
    sheet.getRange(i, col['SKUs']).setValue('01010101');
    sheet.getRange(i, col['Titles']).setValue('Slippers');
    sheet.getRange(i, col['Qty']).setValue('1');
    sheet.getRange(i, col['ASIN_Status']).setValue('OK');
    sheet.getRange(i, col['Error_Message']).setValue('');
    filled++;
  }

  ss.toast(`Filled ${filled} row(s)`, 'ASIN Tools', 4);
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