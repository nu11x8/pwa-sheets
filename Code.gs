// スプレッドシートの「拡張機能 > Apps Script」に貼り付ける
const SECRET = "change-me";      // index.html の SECRET と同じ値にする
const SHEET_NAME = "シート1";     // 書き込み先のシート名（タブ名）に合わせる
const HEADERS = ["送信日時", "日付", "項目", "店", "金額", "メモ"];
const SUMMARY_CATEGORIES = ["食費", "外食"]; // 今月の合計を返す項目

function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

// 1行追記
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return json_({ ok: false, error: "unauthorized" });

    const r = body.row;
    const sheet = getSheet_();
    if (!sheet) return json_({ ok: false, error: "sheet not found" });
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    // 日付は文字列ではなく日付値で保存（集計をずらさないため）
    const p = String(r.date).split("-").map(Number);
    const date = new Date(p[0], p[1] - 1, p[2]);

    sheet.appendRow([new Date(r.sentAt), date, r.category, r.store || "", r.amount, r.memo]);
    sheet.getRange(sheet.getLastRow(), 2).setNumberFormat("yyyy-mm-dd");
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 月合計を返す: ?action=summary&month=2026-09&secret=...
function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.secret !== SECRET) return json_({ ok: false, error: "unauthorized" });
    if (p.action !== "summary") return json_({ ok: false, error: "unknown action" });

    const sheet = getSheet_();
    if (!sheet) return json_({ ok: false, error: "sheet not found" });

    const totals = {};
    SUMMARY_CATEGORIES.forEach(c => totals[c] = 0);

    const values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      const h = values[0];
      const iDate = h.indexOf("日付"), iCat = h.indexOf("項目"), iAmt = h.indexOf("金額");
      if (iDate < 0 || iCat < 0 || iAmt < 0) return json_({ ok: false, error: "header not found" });

      const tz = Session.getScriptTimeZone();
      for (let i = 1; i < values.length; i++) {
        const v = values[i][iDate];
        const m = v instanceof Date
          ? Utilities.formatDate(v, tz, "yyyy-MM")
          : String(v).replace(/\//g, "-").slice(0, 7);
        const cat = values[i][iCat];
        if (m === p.month && totals.hasOwnProperty(cat)) {
          totals[cat] += Number(values[i][iAmt]) || 0;
        }
      }
    }
    return json_({ ok: true, month: p.month, totals: totals });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
