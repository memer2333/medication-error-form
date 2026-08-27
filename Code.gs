// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const DRIVE_FOLDER_ID = '1wPb1wRgyVSy3f9SmBgnST6ZCLW2-O-5d'; // Google Drive folder ID for file uploads

// ============================================
// MAIN POST HANDLER
// ============================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    let fileUrlString = '';
    
    // Handle multiple file uploads to Google Drive
    if (data.files && data.files.length > 0) {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      let urls = [];
      for (let i = 0; i < data.files.length; i++) {
        const fileObj = data.files[i];
        if (fileObj.fileData && fileObj.fileName) {
          const decoded = Utilities.base64Decode(fileObj.fileData);
          const blob = Utilities.newBlob(decoded, fileObj.fileMimeType || 'application/octet-stream', fileObj.fileName);
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          urls.push(file.getUrl());
        }
      }
      fileUrlString = urls.join('\n');
    }
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    let sheet, rowData, headers;
    
    if (data.formType === 'ADR_REPORTING') {
      sheet = spreadsheet.getSheetByName('ADR Reports');
      if (!sheet) {
        sheet = spreadsheet.insertSheet('ADR Reports');
      }
      
      headers = [
        'Timestamp', 'Patient Name', 'Age', 'Gender', 'Ward', 'Suspected Drug', 
        'Reaction Details', 'Reporter Name', 'Department', 'Yellow Card Issued', 'ADR Form Picture URL'
      ];
      rowData = [
        timestamp,
        data.patientName || '',
        data.age || '',
        data.gender || '',
        data.ward || '',
        data.suspectedDrug || '',
        data.reactionDetails || '',
        data.reporterName || '',
        data.department || '',
        data.yellowCardIssued || '',
        fileUrlString
      ];
    } else if (data.formType === 'NEW_DRUG_APPROVAL') {
      sheet = spreadsheet.getSheetByName('New Drug Approvals');
      if (!sheet) {
        sheet = spreadsheet.insertSheet('New Drug Approvals');
      }
      
      headers = ['Timestamp', 'Drug Name', 'Generic Name', 'Manufacturer', 'Price', 'Documentation Form URL'];
      rowData = [
        timestamp,
        data.drugName || '',
        data.genericName || '',
        data.manufacturer || '',
        data.price || '',
        fileUrlString
      ];
    } else {
      // Default to Medication Error Reporting
      sheet = spreadsheet.getSheetByName('Medication Errors');
      if (!sheet) {
        sheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.insertSheet('Medication Errors');
        sheet.setName('Medication Errors'); // rename default
      }
      
      headers = [
        'Timestamp', 'Patient Name', 'Age', 'Gender', 'Date of Admission', 'Department', 'Ward No',
        'Diagnosis', 'Date & Time of Error', 'Date & Time of Reporting', 'How Error Identified',
        'Professional Status', 'Medication Involved', 'Type of Errors', 'Brief Description',
        'Error Reached Patient', 'Outcome Category', 'Root Cause Analysis', 'Other Root Causes',
        'Corrective Action', 'Preventive Action', 'Reporter Name', 'Error Picture URL'
      ];
      
      rowData = [
        timestamp, data.patientName || '', data.age || '', data.gender || '', data.dateOfAdmission || '',
        data.department || '', data.wardNo || '', data.diagnosis || '', data.errorDateTime || '',
        data.reportDateTime || '', data.howIdentified || '', data.professionalStatus || '',
        data.medicationName || '', data.typeOfErrors || '', data.errorDescription || '',
        data.errorReachedPatient || '', data.outcomeCategory || '', data.rootCause || '',
        data.otherRootCauses || '', data.correctiveAction || '', data.preventiveAction || '',
        data.reporterName || '', fileUrlString
      ];
    }
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    
    // Append data row
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Report submitted successfully!' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// GET HANDLER (for testing)
// ============================================
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Clinical Pharmacy Form API is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
