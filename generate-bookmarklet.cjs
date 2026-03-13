const fs = require('fs');

const script = `javascript:(async function(){
  try {
    const items = [];
    const elements = document.querySelectorAll('.g-item-sortable');
    if (elements.length === 0) {
      alert("Keine Deko-Gegenstände gefunden. Bist du auf der Amazon-Wunschliste und hast bis nach ganz unten gescrollt?");
      return;
    }
    
    elements.forEach(el => {
      const idStr = el.getAttribute('data-id') || el.getAttribute('data-itemid') || ('fb' + Math.random());
      const titleEl = el.querySelector('a.a-link-normal[title]') || el.querySelector('.g-title a') || el.querySelector('h3 a');
      const title = titleEl ? (titleEl.getAttribute('title') || titleEl.innerText).trim() : el.innerText.substring(0,50);
      
      const priceOffscreen = el.querySelector('.a-price .a-offscreen');
      const priceColor = el.querySelector('.a-color-price');
      const priceText = priceOffscreen ? priceOffscreen.innerText : (priceColor ? priceColor.innerText : '');
      let price = null;
      if (priceText) {
         const match = priceText.match(/[\\d.,]+/);
         if (match) price = parseFloat(match[0].replace('.', '').replace(',', '.'));
      }
      
      const imgEl = el.querySelector('img');
      let imageUrl = imgEl ? imgEl.getAttribute('src') : null;
      if (imageUrl && imageUrl.includes('._S')) {
         imageUrl = imageUrl.replace(/\\._S[^\\.]+\\./, '.'); 
      }
      
      let productUrl = titleEl ? titleEl.getAttribute('href') : null;
      if (productUrl && productUrl.startsWith('/')) {
        productUrl = 'https://www.amazon.de' + productUrl;
      }
      
      const asinMatch = productUrl ? productUrl.match(/\\/dp\\/([A-Z0-9]{10})/) : null;
      const external_id = asinMatch ? asinMatch[1] : ('WL-' + idStr);
      
      if (title && external_id && !items.find((i) => i.external_id === external_id)) {
        items.push({
          external_id,
          title,
          price,
          image_url: imageUrl,
          product_url: productUrl,
          room: 'Lesezeichen',
          is_new: true,
          purchase_status: 'geplant'
        });
      }
    });
    
    if (!confirm(items.length + " Gegenstände auf der Liste gefunden! Jetzt in die DekoApp importieren/aktualisieren?")) return;
    
    const url = 'https://figesrofezniocddofsv.supabase.co/functions/v1/amazon-scraper';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZ2Vzcm9mZXpuaW9jZGRvZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mjk5MTYsImV4cCI6MjA4OTAwNTkxNn0.gvcu5f566atbksLhwbuTG1GX8xIg4C3pMiG5hMC-It0'; 
    
    document.body.style.opacity = '0.5';
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + anonKey },
      body: JSON.stringify({ items: items })
    });
    
    document.body.style.opacity = '1';
    
    if (res.ok) {
        alert("✅ Erfolgreich in Supabase importiert! Gehe nun in deine DekoApp, um sie zu sehen.");
    } else {
        const text = await res.text();
        alert("❌ Fehler beim Import: " + res.status + " " + text);
    }
  } catch (e) {
    alert("❌ Skript-Fehler: " + e.message);
  }
})();`;

// Fast minification
const minified = script.replace(/\\n/g, '').replace(/\\s{2,}/g, ' ');
fs.writeFileSync('bookmarklet.txt', minified);
console.log("Bookmarklet generated!");
