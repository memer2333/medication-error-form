// ============================================================
// Medication Error Reporting Form — Frontend Script
// ============================================================

// ⚠️ REPLACE THIS with your deployed Google Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKC5LjEk5egIedZxG3nPFMuu1BYv_952NrLKSslY12/dev';

// ------------------------------------------------------------
// Interactive Card Selection — Global Functions (inline onclick)
// ------------------------------------------------------------

// Radio: single-select within a group
function selectRadio(el) {
  const group = el.closest('.radio-group');
  group.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

// Checkbox: multi-select toggle
function toggleCheckbox(el) {
  el.classList.toggle('selected');
}

// Outcome category: single-select like radio
function selectOutcome(el) {
  document.querySelectorAll('.outcome-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

// ------------------------------------------------------------
// File Upload Handling
// ------------------------------------------------------------

const fileUploadArea = document.getElementById('fileUploadArea');
const fileInput = document.getElementById('errorPicture');
const filePreview = document.getElementById('filePreview');
const fileNameEl = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');

fileUploadArea.addEventListener('click', () => fileInput.click());

fileUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
  fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    showFilePreview(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) showFilePreview(e.target.files[0]);
});

function showFilePreview(file) {
  fileNameEl.textContent = `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  filePreview.style.display = 'flex';
  fileUploadArea.style.display = 'none';
}

removeFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  filePreview.style.display = 'none';
  fileUploadArea.style.display = '';
});

// ------------------------------------------------------------
// File to Base64 Conversion
// ------------------------------------------------------------

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Strip data:…;base64, prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ------------------------------------------------------------
// Helpers — Get Selected Values via data-name attributes
// ------------------------------------------------------------

function getRadioValue(dataName) {
  const group = document.querySelector(`.radio-group[data-name="${dataName}"]`);
  if (!group) return '';
  const selected = group.querySelector('.radio-option.selected');
  return selected ? selected.getAttribute('data-value') : '';
}

function getCheckboxValues(dataName) {
  const group = document.querySelector(`[data-name="${dataName}"]`);
  if (!group) return '';
  const selected = group.querySelectorAll('.checkbox-option.selected');
  return Array.from(selected).map(el => el.getAttribute('data-value')).join(', ');
}

function getOutcomeValue() {
  const selected = document.querySelector('.outcome-option.selected');
  return selected ? selected.getAttribute('data-value') : '';
}

// ------------------------------------------------------------
// Toast Notification
// ------------------------------------------------------------

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ------------------------------------------------------------
// Success Modal
// ------------------------------------------------------------

function showSuccessModal() {
  document.getElementById('successOverlay').classList.add('active');
}

function closeSuccessAndReset() {
  document.getElementById('successOverlay').classList.remove('active');
  document.getElementById('errorReportForm').reset();
  // Reset all card-style selections
  document.querySelectorAll('.radio-option.selected, .checkbox-option.selected, .outcome-option.selected')
    .forEach(el => el.classList.remove('selected'));
  // Reset file upload area
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('fileUploadArea').style.display = '';
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make globally available for inline onclick in HTML
window.selectRadio = selectRadio;
window.toggleCheckbox = toggleCheckbox;
window.selectOutcome = selectOutcome;
window.closeSuccessAndReset = closeSuccessAndReset;

// ------------------------------------------------------------
// Form Validation
// ------------------------------------------------------------

function validateForm() {
  const errors = [];

  if (!document.getElementById('patientName').value.trim()) errors.push('Patient Name is required');
  if (!document.getElementById('age').value.trim()) errors.push('Age is required');
  if (!document.getElementById('gender').value) errors.push('Gender is required');
  if (!document.getElementById('department').value) errors.push('Department is required');
  if (!document.getElementById('wardNo').value.trim()) errors.push('Ward No is required');
  if (!document.getElementById('diagnosis').value.trim()) errors.push('Diagnosis is required');
  if (!document.getElementById('errorDateTime').value) errors.push('Date & Time of Error is required');
  if (!document.getElementById('reportDateTime').value) errors.push('Date & Time of Reporting is required');
  if (!getRadioValue('howIdentified')) errors.push('How was Error Identified is required');
  if (!getCheckboxValues('typeOfErrors')) errors.push('Type of Errors is required');
  if (!document.getElementById('errorDescription').value.trim()) errors.push('Brief Description of Error is required');
  if (!getRadioValue('errorReachedPatient')) errors.push('Did the Error Reach the Patient is required');
  if (!document.getElementById('reporterName').value) errors.push('Reporter Name is required');
  if (!document.getElementById('errorPicture').files.length) errors.push('Error Picture is required');

  return errors;
}

// ------------------------------------------------------------
// Form Submission
// ------------------------------------------------------------

document.getElementById('errorReportForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate
  const errors = validateForm();
  if (errors.length > 0) {
    showToast(errors[0], 'error');
    return;
  }

  // Loading state
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  submitBtn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span> Submitting...';

  try {
    // Prepare file data
    let fileData = null;
    let fileNameStr = '';
    let fileMimeType = '';
    const fileInputEl = document.getElementById('errorPicture');
    if (fileInputEl.files.length > 0) {
      const file = fileInputEl.files[0];
      fileData = await fileToBase64(file);
      fileNameStr = file.name;
      fileMimeType = file.type;
    }

    // Build payload — keys MUST match Code.gs exactly
    const payload = {
      patientName: document.getElementById('patientName').value.trim(),
      age: document.getElementById('age').value.trim(),
      gender: document.getElementById('gender').value,
      dateOfAdmission: document.getElementById('dateOfAdmission').value || '',
      department: document.getElementById('department').value,
      wardNo: document.getElementById('wardNo').value.trim(),
      diagnosis: document.getElementById('diagnosis').value.trim(),
      errorDateTime: document.getElementById('errorDateTime').value,
      reportDateTime: document.getElementById('reportDateTime').value,
      howIdentified: getRadioValue('howIdentified'),
      professionalStatus: getRadioValue('professionalStatus'),
      medicationName: document.getElementById('medicationName').value.trim(),
      typeOfErrors: getCheckboxValues('typeOfErrors'),
      errorDescription: document.getElementById('errorDescription').value.trim(),
      errorReachedPatient: getRadioValue('errorReachedPatient'),
      outcomeCategory: getOutcomeValue(),
      rootCausePeople: getCheckboxValues('rootCausePeople'),
      rootCauseProcess: getCheckboxValues('rootCauseProcess'),
      rootCauseEnvironment: getCheckboxValues('rootCauseEnvironment'),
      rootCauseEquipment: getCheckboxValues('rootCauseEquipment'),
      otherRootCauses: document.getElementById('otherRootCauses').value.trim(),
      correctiveAction: document.getElementById('correctiveAction').value.trim(),
      preventiveAction: document.getElementById('preventiveAction').value.trim(),
      reporterName: document.getElementById('reporterName').value,
      // File data
      fileName: fileNameStr,
      fileMimeType: fileMimeType,
      fileData: fileData
    };

    // Send to Google Apps Script
    // Using 'text/plain' content-type to avoid CORS preflight request
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === 'success') {
      showSuccessModal();
    } else {
      showToast(result.message || 'Submission failed. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Submission error:', error);
    showToast('Network error. Please check your connection and try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Submit Report';
  }
});
