(function(){
  const cfg = window.GK_CONFIG || {};
  const $ = (s)=>document.querySelector(s);
  const telLink = $("#telLink");
  const wa1 = $("#whatsappCTA");
  const wa2 = $("#waLink");
  const airbnb = $("#airbnbLink");
  const stripe = $("#stripeLink");
  const yearEl = $("#year");

  if(yearEl) yearEl.textContent = new Date().getFullYear();
  if(telLink && cfg.telNumber){ telLink.href = "tel:"+cfg.telNumber; telLink.textContent = cfg.telNumber; }

  function waHref(msg){
    const base = "https://wa.me/";
    const num = (cfg.whatsappNumber||"").replace(/\D/g,"");
    const text = encodeURIComponent(msg);
    return num ? base+num+"?text="+text : "#";
  }

  const defaultMsg = "Hi! I’d like to book the Luxury Lavington Suite. Are these dates available?";
  if(wa1) wa1.href = waHref(defaultMsg);
  if(wa2) wa2.href = waHref(defaultMsg);

  if(airbnb && cfg.airbnbUrl) airbnb.href = cfg.airbnbUrl;
  if(stripe && cfg.stripeCheckoutUrl) stripe.href = cfg.stripeCheckoutUrl;

  // Booking calculator
  const nightlyRateDisplay = $("#nightlyRateDisplay");
  const nightsDisplay = $("#nightsDisplay");
  const subtotalDisplay = $("#subtotalDisplay");
  const cleaningDisplay = $("#cleaningDisplay");
  const totalDisplay = $("#totalDisplay");
  const checkIn = $("#checkIn");
  const checkOut = $("#checkOut");
  const promo = $("#promo");

  function fmt(n){ return "$"+(Math.round(n*100)/100).toLocaleString(undefined,{minimumFractionDigits:0, maximumFractionDigits:2}); }
  function calc(){
    const nightly = +cfg.nightlyRate || 50;
    const cleaning = +cfg.cleaningFee || 15;
    const start = checkIn.value ? new Date(checkIn.value) : null;
    const end = checkOut.value ? new Date(checkOut.value) : null;
    let nights = 0;
    if(start && end){
      const ms = end - start; nights = ms>0 ? Math.round(ms/86400000) : 0;
    }
    let subtotal = nightly * nights;
    const code = (promo.value||"").trim().toUpperCase();
    if(cfg.promoCodes && cfg.promoCodes[code]) subtotal -= subtotal * cfg.promoCodes[code];
    const total = subtotal + (nights>0 ? cleaning : 0);

    nightlyRateDisplay.textContent = fmt(nightly);
    nightsDisplay.textContent = nights;
    subtotalDisplay.textContent = fmt(Math.max(0, subtotal));
    cleaningDisplay.textContent = fmt(nights>0 ? cleaning : 0);
    totalDisplay.textContent = fmt(Math.max(0, total));
  }
  ["input","change"].forEach(evt=>document.addEventListener(evt, e=>{
    if(e.target && (e.target.id==="checkIn" || e.target.id==="checkOut" || e.target.id==="promo")) calc();
  }));
  calc();

  // Reserve -> WhatsApp handoff
  const bookingForm = $("#bookingForm");
  if(bookingForm){
    bookingForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const ci = checkIn.value, co = checkOut.value;
      if(!ci || !co){ alert("Please select your dates."); return; }
      const message = `Hi! I'd like to reserve from ${ci} to ${co} for the Luxury Lavington Suite.`;
      window.open(waHref(message), "_blank");
    });
  }
})();

// iCal proxy + disable booked dates
(function(){
  const status = document.getElementById("icsStatus");
  const btn = document.getElementById("loadIcs");
  const icalInput = document.getElementById("icalUrl");
  const checkIn = document.getElementById("checkIn");
  const checkOut = document.getElementById("checkOut");

  let booked = new Set();
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);

  function expandRange(dtStartStr, dtEndStr) {
    const norm = s => {
      if (!s) return null;
      s = s.replace('Z','');
      const m = s.match(/(\d{4})(\d{2})(\d{2})/);
      if (!m) return null;
      return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    };
    const start = norm(dtStartStr);
    const endExclusive = norm(dtEndStr);
    if (!start || !endExclusive) return;
    for (let d = new Date(start); d < endExclusive; d.setDate(d.getDate()+1)) {
      booked.add(iso(d));
    }
  }

  async function loadCalendar(){
    const src = icalInput.value.trim();
    if (!src){ status.textContent = "Paste an iCal URL first."; return; }
    status.textContent = "Loading calendar…";
    try{
      const res = await fetch("/.netlify/functions/fetch-ics?url="+encodeURIComponent(src));
      if(!res.ok) throw new Error("HTTP "+res.status);
      const ics = await res.text();
      booked = new Set();
      const blocks = ics.split("BEGIN:VEVENT").slice(1);
      for (const b of blocks) {
        const dtStart = (b.match(/DTSTART[^:]*:(.+)/) || [])[1];
        const dtEnd   = (b.match(/DTEND[^:]*:(.+)/) || [])[1];
        expandRange(dtStart, dtEnd);
      }
      status.textContent = `Synced. Blocked ${booked.size} booked nights.`;

      function guard(input){
        input.addEventListener("input", (e)=>{
          const v = e.target.value;
          if (booked.has(v)){
            alert("That date is unavailable. Please choose another.");
            e.target.value = "";
          }
        });
      }
      guard(checkIn); guard(checkOut);
      const today = iso(new Date());
      if (checkIn) checkIn.min = today;
      if (checkOut) checkOut.min = today;
    }catch(err){
      status.textContent = "Could not load iCal (check URL).";
    }
  }

  if(btn) btn.addEventListener("click", loadCalendar);
})();

// WhatsApp bubble + gallery lightbox + direct ICS link (CSV->ICS)
(function(){
  const cfg = window.GK_CONFIG||{};
  function waHref(msg){
    const base = "https://wa.me/"; const num = (cfg.whatsappNumber||"").replace(/\D/g,""); const text = encodeURIComponent(msg);
    return num ? base+num+"?text="+text : "#";
  }
  const bubble = document.getElementById("waBubble");
  if(bubble){ bubble.href = waHref("Hi! I’d like to book the Luxury Lavington Suite. Are these dates available?"); }

  const directLink = document.getElementById("directIcsLink");
  if(directLink){ directLink.href = "/.netlify/functions/direct-ics"; }

  const grid = document.querySelector(".gallery__grid");
  if(grid){
    const lb = document.createElement("div");
    lb.className = "lightbox";
    const img = document.createElement("img");
    lb.appendChild(img);
    document.body.appendChild(lb);
    grid.addEventListener("click", (e)=>{
      const t = e.target;
      if(t && t.tagName === "IMG"){ img.src = t.src; lb.classList.add("show"); }
    });
    lb.addEventListener("click", ()=> lb.classList.remove("show"));
  }
})();
