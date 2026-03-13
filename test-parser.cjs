const fs = require('fs');

async function test() {
    // Import cheerio dynamically because it's an ES module that Node 20 can `import()`
    const cheerio = await import('cheerio');
    
    const html = fs.readFileSync('amazon_raw.html', 'utf-8');
    const $ = cheerio.load(html);

    const items = [];
    $('.g-item-sortable').each((_i, el) => {
        const element = $(el);
        const idStr = element.attr('data-itemid') || element.attr('data-id') || element.attr('data-reposition-action-params') || '';
        
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
        const external_id = asinMatch ? asinMatch[1] : (idStr ? `WL-${idStr}` : null);
        
        if (title && external_id) {
            items.push({ external_id, title, price });
        }
    });

    console.log(`Found ${items.length} visible items.`);
    if (items.length > 0) {
        console.log("First item:", items[0]);
        console.log("Last item:", items[items.length - 1]);
    }

    let lazyItems = 0;
    const scriptTags = $('script').toArray();
    for (const script of scriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('input.items')) {
          const escapedHtmlMatches = scriptContent.match(/<li.*?g-item-sortable.*?(?:<\\/li>|(?=<li))/g);
          if (escapedHtmlMatches) {
              for (const matchStr of escapedHtmlMatches) {
                  let cleanHtml = matchStr.replace(/\\"/g, '"').replace(/\\\\n/g, '').replace(/\\\\\\/`/g, '/');
                  const $lazy = cheerio.load(cleanHtml);
                  $lazy('.g-item-sortable').each((_i, el) => {
                      lazyItems++;
                  });
              }
          }
      }
    }
    console.log(`Found ${lazyItems} lazy items via script parsing.`);
}

test().catch(console.error);
