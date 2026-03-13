import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const url = "https://www.amazon.de/hz/wishlist/ls/2XS8E12UVZDNI?ref_=wl_share";

async function fetchAmazonList() {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items: any[] = [];
    
    // 1. Visible items
    $('.g-item-sortable').each((_, el) => {
        const id = $(el).attr('data-itemid');
        items.push({ type: 'visible', id });
    });
    
    console.log(`Found ${items.length} visible items using .g-item-sortable`);
    
    // 2. Check scripts
    let lazyItems = 0;
    $('script').each((_, el) => {
        const content = $(el).html() || '';
        if (content.includes('g-item-sortable') || content.includes('data-itemid')) {
            const matches = content.match(/data-itemid[\\\"'=]+([A-Z0-9]+)/g);
            if (matches) {
                console.log(`Found lazy-load script with ${matches.length} possible items.`);
                lazyItems += matches.length;
            }
        }
    });
    
    console.log(`Total found: ${items.length} visible + ${lazyItems} lazy matches.`);
    
    // Write the raw HTML to a file so we can inspect it if needed
    Deno.writeTextFileSync("amazon_raw.html", html);
    console.log("Saved raw HTML to amazon_raw.html");
}

fetchAmazonList();
