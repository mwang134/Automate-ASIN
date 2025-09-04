const OUTPUT_HEADERS = ['ASINs', 'SKUs', 'Titles', 'Qty', 'ASIN_Status', 'Error_Message'];
const ANCHOR_HEADER = 'Product Details';
const ORDER_ID_HEADER = 'Order ID';

// Configuration object for better maintainability
const CONFIG = {
  TEST_DATA: {
    ASIN: '0000000',
    SKU: '01010101',
    TITLE: 'Slippers',
    QTY: '1',
    STATUS: 'OK',
    ERROR: ''
  },
  TOAST_DURATION: 4,
  BACKEND_URL: 'http://127.0.0.1:8080' // Your Flask backend URL
};

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('ASIN Tools')
    .addItem('Fill Selected (test)', 'fillSelected')
    .addItem('Fill Selected (real)', 'fillSelectedReal')
    .addToUi();
}

function fillSelected() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getActiveSheet();
  const rng = sheet.getActiveRange();

  if (!rng) {
    showToast(ss, 'Select some rows first', 'ASIN Tools');
    return;
  }

  // Make sure to not highlight the very first row
  const start = Math.max(rng.getRow(), 2);
  const end = rng.getRow() + rng.getNumRows() - 1;             

  // Fill in any empty header lines
  const col = insertOutputHeaders(ss, sheet);      
  let filled = 0;

  // Test
  for (let i = start; i <= end; i++) {
    const orderId = sheet.getRange(i, col[ORDER_ID_HEADER]).getValue();
    
    if (!orderId) {
      continue;
    }

    fillRowWithTestData(sheet, i, col);
    filled++;
  }

  showToast(ss, `Filled ${filled} row(s)`, 'ASIN Tools');
}

// New function to fill with real data from backend
function fillSelectedReal() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getActiveSheet();
  const rng = sheet.getActiveRange();

  if (!rng) {
    showToast(ss, 'Select some rows first', 'ASIN Tools');
    return;
  }

  // Make sure to not highlight the very first row
  const start = Math.max(rng.getRow(), 2);
  const end = rng.getRow() + rng.getNumRows() - 1;             

  // Fill in any empty header lines
  const col = insertOutputHeaders(ss, sheet);      
  
  // Collect order IDs
  const orderIds = [];
  for (let i = start; i <= end; i++) {
    const orderId = sheet.getRange(i, col[ORDER_ID_HEADER]).getValue();
    if (orderId) {
      orderIds.push(orderId);
    }
  }

  if (orderIds.length === 0) {
    showToast(ss, 'No order IDs found in selected rows', 'ASIN Tools');
    return;
  }

  try {
    // Call backend API
    const results = callBackendAPI(orderIds);
    
    // Fill rows with real data
    let filled = 0;
    for (let i = start; i <= end; i++) {
      const orderId = sheet.getRange(i, col[ORDER_ID_HEADER]).getValue();
      if (!orderId) continue;
      
      const result = results.find(r => r.orderId === orderId);
      if (result) {
        fillRowWithRealData(sheet, i, col, result);
        filled++;
      }
    }
    
    showToast(ss, `Filled ${filled} row(s) with real data`, 'ASIN Tools');
  } catch (error) {
    showToast(ss, `Error: ${error.message}`, 'ASIN Tools');
    console.error('Backend API error:', error);
  }
}

// Function to call backend API
function callBackendAPI(orderIds) {
  const url = `${CONFIG.BACKEND_URL}/fill-asins`;
  const payload = {
    orderIds: orderIds
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`Backend error: ${data.error || 'Unknown error'}`);
    }
    
    return data.results || [];
  } catch (error) {
    throw new Error(`API call failed: ${error.message}`);
  }
}

// Function to fill row with real data from API response
function fillRowWithRealData(sheet, rowIndex, col, result) {
  if (result.status === 'OK') {
    setCellValue(sheet, rowIndex, col['ASINs'], result.asins || '');
    setCellValue(sheet, rowIndex, col['SKUs'], result.skus || '');
    setCellValue(sheet, rowIndex, col['Titles'], result.titles || '');
    setCellValue(sheet, rowIndex, col['Qty'], result.qty || '');
    setCellValue(sheet, rowIndex, col['ASIN_Status'], 'OK');
    setCellValue(sheet, rowIndex, col['Error_Message'], '');
  } else {
    setCellValue(sheet, rowIndex, col['ASINs'], '');
    setCellValue(sheet, rowIndex, col['SKUs'], '');
    setCellValue(sheet, rowIndex, col['Titles'], '');
    setCellValue(sheet, rowIndex, col['Qty'], '');
    setCellValue(sheet, rowIndex, col['ASIN_Status'], 'ERROR');
    setCellValue(sheet, rowIndex, col['Error_Message'], result.error || 'Unknown error');
  }
}

// Reusable function to fill a single row with test data
function fillRowWithTestData(sheet, rowIndex, col) {
  const data = CONFIG.TEST_DATA;
  
  setCellValue(sheet, rowIndex, col['ASINs'], data.ASIN);
  setCellValue(sheet, rowIndex, col['SKUs'], data.SKU);
  setCellValue(sheet, rowIndex, col['Titles'], data.TITLE);
  setCellValue(sheet, rowIndex, col['Qty'], data.QTY);
  setCellValue(sheet, rowIndex, col['ASIN_Status'], data.STATUS);
  setCellValue(sheet, rowIndex, col['Error_Message'], data.ERROR);
}

// Reusable function to set cell value with error handling
function setCellValue(sheet, row, col, value) {
  try {
    sheet.getRange(row, col).setValue(value);
  } catch (error) {
    console.error(`Error setting value at row ${row}, col ${col}: ${error.message}`);
  }
}

// Reusable function to show toast messages
function showToast(ss, message, title) {
  ss.toast(message, title, CONFIG.TOAST_DURATION);
}

// Inserts any empty column with header lines
function insertOutputHeaders(ss, sheet) {
  // reads first header row
  const lastCol = sheet.getLastColumn() || 2; 
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const anchorIndex = headers.indexOf(ANCHOR_HEADER);

  if (anchorIndex === -1) {
    showToast(ss, `Add a header named ${ANCHOR_HEADER} in row 1`, 'ASIN Tools');
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

// Utility function to get column mapping (reusable for other functions)
function getColumnMapping(sheet) {
  const lastCol = sheet.getLastColumn() || 1;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i + 1; });
  return col;
}

// Utility function to validate required columns exist
function validateRequiredColumns(sheet, requiredColumns) {
  const col = getColumnMapping(sheet);
  const missing = requiredColumns.filter(colName => !col[colName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }
  
  return col;
}