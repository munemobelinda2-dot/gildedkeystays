// Reads bundled CSV at netlify/functions/data/direct-bookings.csv
// or ?csv=<public Google Sheet CSV> to override.
import { readFile } from 'node:fs/promises';

function csvToIcs(csvText){
  const rows = csvText.trim().split(/\r?\n/);
  const headers = rows.shift().split(',');
  const idx = {
    title: headers.findIndex(h=>/title/i.test(h)),
    start: headers.findIndex(h=>/start/i.test(h)),
    end:   headers.findIndex(h=>/end/i.test(h)),
    notes: headers.findIndex(h=>/note/i.test(h))
  };
  const out = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GildedKey//DirectBookings//EN"];
  for(const row of rows){
    if(!row.trim()) continue;
    const cols=row.split(',');
    const title=(cols[idx.title]||"Direct Booking").trim();
    const start=(cols[idx.start]||"").trim();
    const end  =(cols[idx.end]||"").trim();
    const notes=(cols[idx.notes]||"").trim();
    if(!start||!end) continue;
    const uid=Math.random().toString(36).slice(2)+"@gildedkey";
    out.push("BEGIN:VEVENT");
    out.push("UID:"+uid);
    out.push("DTSTAMP:"+start.replace(/-/g,"")+"T000000Z");
    out.push("DTSTART;VALUE=DATE:"+start.replace(/-/g,""));
    out.push("DTEND;VALUE=DATE:"+end.replace(/-/g,""));
    out.push("SUMMARY:"+title);
    if(notes) out.push("DESCRIPTION:"+notes.replace(/,/g," "));
    out.push("END:VEVENT");
  }
  out.push("END:VCALENDAR");
  return out.join("\r\n");
}

export async function handler(event){
  const csvUrl = event.queryStringParameters.csv;
  try{
    if(csvUrl){
      const res = await fetch(csvUrl);
      if(!res.ok) throw new Error("HTTP "+res.status);
      const text = await res.text();
      return { statusCode: 200, headers: { "Content-Type": "text/calendar; charset=utf-8" }, body: csvToIcs(text) };
    } else {
      const csvPath = new URL("./data/direct-bookings.csv", import.meta.url);
      const text = await readFile(csvPath, "utf-8");
      return { statusCode: 200, headers: { "Content-Type": "text/calendar; charset=utf-8" }, body: csvToIcs(text) };
    }
  }catch(err){ return { statusCode: 500, body: "Error: " + err.message }; }
}
