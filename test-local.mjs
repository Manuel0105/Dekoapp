import fs from 'fs';
import * as cheerio from 'cheerio';

async function test() {
    const html = fs.readFileSync('amazon_raw.html', 'utf-8');
    const $ = cheerio.load(html);

    const items = [];
    
    // Exact copy of edge function
    const parseItem = (_i, el, local$) => {
      const element = local$(el);
      
      const idStr = element.attr('data-itemid') || element.attr('data-id') || element.attr('data-reposition-action-params') || `fallback-${_i}-${Date.now()}`;
      
      const title = element.find('a.a-link-normal[title]').attr('title') || 
                    element.find('.g-title a').text().trim();
                    
      const priceText = element.find('.a-price .a-offscreen').first().text().trim() ||
                        element.find('.a-color-price').first().text().trim();
                        
      let price = null;
      if (priceText) {
         const numMatch = priceText.match(/[\\d.,]+/);
         if (numMatch) {
            price = parseFloat(numMatch[0].replace('.', '').replace(',', '.'));
         }
      }
      
      const linkEl = element.find('.g-title a');
      let productUrl = linkEl.attr('href');
      if (productUrl && productUrl.startsWith('/')) {
        productUrl = 'https://www.amazon.de' + productUrl;
      }
      
      const asinMatch = productUrl ? productUrl.match(/\\/dp\\/([A-Z0-9]{10})/) : null;
      const external_id = asinMatch ? asinMatch[1] : `WL-${idStr}`;

      if (title && !items.find((i) => i.external_id === external_id)) {
        items.push({
          external_id,
          title
        });
      } else if (title) {
        console.log("Duplicate found:", external_id, title)
      } else {
        console.log("Missing title for id:", idStr)
      }
    };

    $('.g-item-sortable').each((_i, el) => parseItem(_i, el, $));
    console.log("After visible:", items.length);

    const scriptTags = $('script').toArray();
    for (const script of scriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('g-item-sortable')) {
           console.log("Found matching script block:", scriptContent.length, "bytes")
           const escapedHtmlMatches = scriptContent.match(/<li.*?g-item-sortable.*?(?:<\\/li>|(?=<li))/g);
           console.log("Regex matches:", escapedHtmlMatches ? escapedHtmlMatches.length : 0)
           
           if (escapedHtmlMatches) {
               for (const matchStr of escapedHtmlMatches) {
                   let cleanHtml = matchStr.replace(/\\"/g, '"').replace(/\\\\n/g, '').replace(/\\\\\\/`/g, '/');
                   const $lazy = cheerio.load(cleanHtml);
                   $lazy('.g-item-sortable').each((_i, el) => parseItem(_i, el, $lazy));
               }
           }
      }
    }

    console.log("Final length:", items.length);
}

test().catch(console.error);
