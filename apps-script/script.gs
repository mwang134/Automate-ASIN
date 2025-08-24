function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('ASIN Tools')
    .addItem('Fill Selected (placeholder)', 'todo')
    .addToUi();
}
function todo() {
  SpreadsheetApp.getActive().toast('Milestone 3 will add real logic.');
}
