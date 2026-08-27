// ============================================================
// Shared Frontend Script for All Forms
// ============================================================

// ⚠️ REPLACE THIS with your deployed Google Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwz9Fr6KS46FigaAX_LzF5WjA2Bv8yhgw8Tn5b1ZXBNtEOtSu7Pybl5ggqr-1Me6qK7-w/exec';

// ------------------------------------------------------------
// Interactive Card Selection — Global Functions (inline onclick)
// ------------------------------------------------------------
function selectRadio(el) {
  const group = el.closest('.radio-group');
  group.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function toggleCheckbox(el) {
  el.classList.toggle('selected');
}

function selectOutcome(el) {
  document.querySelectorAll('.outcome-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

// ------------------------------------------------------------
// File Upload Handling
// ------------------------------------------------------------
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInput = document.getElementById('uploadFile') || document.getElementById('errorPicture');
const filePreview = document.getElementById('filePreview');
const fileNameEl = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');

if (fileUploadArea && fileInput) {
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
      showFilePreview(e.dataTransfer.files);
    }
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) showFilePreview(e.target.files);
  });
  removeFileBtn.addEventListener('click', () => {
    fileInput.value = '';
    filePreview.style.display = 'none';
    fileUploadArea.style.display = '';
  });
}

function showFilePreview(files) {
  if (files.length === 1) {
    fileNameEl.textContent = `📎 ${files[0].name} (${(files[0].size / 1024 / 1024).toFixed(2)} MB)`;
  } else {
    fileNameEl.textContent = `📎 ${files.length} files selected`;
  }
  filePreview.style.display = 'flex';
  fileUploadArea.style.display = 'none';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
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
// Toast Notification & Modal
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

function showSuccessModal() {
  document.getElementById('successOverlay').classList.add('active');
}

function closeSuccessAndReset() {
  document.getElementById('successOverlay').classList.remove('active');
  document.querySelector('form').reset();
  document.querySelectorAll('.radio-option.selected, .checkbox-option.selected, .outcome-option.selected')
    .forEach(el => el.classList.remove('selected'));
  if (filePreview) filePreview.style.display = 'none';
  if (fileUploadArea) fileUploadArea.style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.selectRadio = selectRadio;
window.toggleCheckbox = toggleCheckbox;
window.selectOutcome = selectOutcome;
window.closeSuccessAndReset = closeSuccessAndReset;

// ------------------------------------------------------------
// Dynamic Form Submission
// ------------------------------------------------------------
const formElement = document.querySelector('form');

if (formElement) {
  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const formType = document.getElementById('formType') ? document.getElementById('formType').value : 'MEDICATION_ERROR';

    // Basic dynamic validation: Check all required inputs
    const requiredInputs = formElement.querySelectorAll('[required]');
    for (let input of requiredInputs) {
      if (!input.value.trim()) {
        const label = input.closest('.form-group').querySelector('label').innerText.replace('*', '').trim();
        showToast(`${label} is required`, 'error');
        return;
      }
    }
    
    if (formType === 'ADR_REPORTING' && !getRadioValue('yellowCardIssued')) {
      showToast('Yellow Card Issued is required', 'error'); return;
    }

    // Loading state
    submitBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Submitting...';

    try {
      let filesData = [];
      if (fileInput && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          const fileData = await fileToBase64(file);
          filesData.push({
            fileName: file.name,
            fileMimeType: file.type,
            fileData: fileData
          });
        }
      }

      // Build payload dynamically based on formType
      const payload = { formType, files: filesData };

      if (formType === 'ADR_REPORTING') {
        payload.patientName = document.getElementById('patientName').value.trim();
        payload.age = document.getElementById('age').value.trim();
        payload.gender = document.getElementById('gender').value;
        payload.ward = document.getElementById('ward').value.trim();
        payload.suspectedDrug = document.getElementById('suspectedDrug').value.trim();
        payload.reactionDetails = document.getElementById('reactionDetails').value.trim();
        payload.yellowCardIssued = getRadioValue('yellowCardIssued');
        payload.reporterName = document.getElementById('reporterName').value.trim();
        payload.department = document.getElementById('department').value.trim();
      } 
      else if (formType === 'NEW_DRUG_APPROVAL') {
        payload.drugName = document.getElementById('drugName').value.trim();
        payload.genericName = document.getElementById('genericName').value.trim();
        payload.manufacturer = document.getElementById('manufacturer').value.trim();
        payload.price = document.getElementById('price').value.trim();
      }
      else {
        // MEDICATION_ERROR
        payload.patientName = document.getElementById('patientName').value.trim();
        payload.age = document.getElementById('age').value.trim();
        payload.gender = document.getElementById('gender').value;
        payload.dateOfAdmission = document.getElementById('dateOfAdmission') ? document.getElementById('dateOfAdmission').value : '';
        payload.department = document.getElementById('department').value;
        payload.wardNo = document.getElementById('wardNo').value.trim();
        payload.diagnosis = document.getElementById('diagnosis').value.trim();
        payload.errorDateTime = document.getElementById('errorDateTime').value;
        payload.reportDateTime = document.getElementById('reportDateTime').value;
        payload.howIdentified = getRadioValue('howIdentified');
        payload.professionalStatus = getRadioValue('professionalStatus');
        payload.medicationName = document.getElementById('medicationName').value.trim();
        payload.typeOfErrors = getCheckboxValues('typeOfErrors');
        payload.errorDescription = document.getElementById('errorDescription').value.trim();
        payload.errorReachedPatient = getRadioValue('errorReachedPatient');
        payload.outcomeCategory = getOutcomeValue();
        payload.rootCause = getCheckboxValues('rootCause');
        payload.otherRootCauses = document.getElementById('otherRootCauses').value.trim();
        payload.correctiveAction = document.getElementById('correctiveAction').value.trim();
        payload.preventiveAction = document.getElementById('preventiveAction').value.trim();
        payload.reporterName = document.getElementById('reporterName').value;
      }

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
      btnText.textContent = 'Submit';
    }
  });
}
