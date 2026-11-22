/**
 * ZaiqaBox Karachi - Google Apps Script Webhook
 * Appends website leads to a Google Sheet named "Leads"
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets and create a new sheet named "ZaiqaBox Leads".
 * 2. Name the first tab "Leads".
 * 3. Add headers in Row 1:
 *    [Timestamp, Name, Email, WhatsApp, Area, Plan, AI Summary, Source, Status]
 * 4. Go to Extensions > Apps Script.
 * 5. Replace any existing code with this script.
 * 6. Click Deploy > New deployment.
 * 7. Select type "Web app".
 * 8. Set Description: "ZaiqaBox Lead Capture Webhook".
 * 9. Set Execute as: "Me" and Who has access: "Anyone".
 * 10. Click Deploy and copy the Web App URL.
 * 11. Paste the URL into your backend .env file as SHEET_WEBHOOK_URL.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheetName = "Leads";
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(sheetName);

    // If sheet doesn't exist, create it with header columns
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
      sheet.appendRow([
        "Timestamp",
        "Name",
        "Email",
        "WhatsApp",
        "Area",
        "Plan",
        "AI Summary",
        "Source",
        "Status"
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#1F5C3A").setFontColor("#FFFFFF");
    }

    var data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    var timestamp = data.timestamp || new Date().toISOString();
    var name = data.name || "";
    var email = data.email || "";
    var whatsapp = data.whatsapp || "";
    var area = data.area || "";
    var plan = data.plan || "";
    var ai_summary = data.ai_summary || "";
    var source = data.source || "Website Form";
    var status = data.status || "New";

    sheet.appendRow([
      timestamp,
      name,
      email,
      whatsapp,
      area,
      plan,
      ai_summary,
      source,
      status
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Lead saved successfully" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", service: "ZaiqaBox Lead Webhook" }))
    .setMimeType(ContentService.MimeType.JSON);
}
