// Prepared UI record only. No RFID, NFC, camera, database or verification call.
const record = document.getElementById('tag-record');
const read = document.getElementById('read-tag');
const status = document.getElementById('tag-status');
read.addEventListener('click', () => {
  record.hidden = false;
  status.textContent = 'The prepared fictional record is displayed. It remains unverified.';
  document.getElementById('record-title').focus();
});
document.getElementById('clear-tag').addEventListener('click', () => {
  record.hidden = true;
  status.textContent = 'Prepared record cleared. No record was sent or saved.';
  read.focus();
});
