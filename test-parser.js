import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('amazon_raw.html', 'utf-8');
const $ = cheerio.load(html);

console.log("Found title:", $('title').text());

const items = [];
$('.g-item-sortable').each((i, el) => {
    const title = $(el).find('a.a-link-normal[title]').attr('title') || $(el).find('.g-title a').text().trim();
    const id = $(el).attr('data-itemid');
    items.push({ id, title });
});

console.log("Visible items via .g-item-sortable:", items.length);
if (items.length > 0) console.log("First item:", items[0]);

let lazyMatches = 0;
// Check scripts for hidden items
$('script').each((i, el) => {
    const scriptContent = $(el).html();
    if (scriptContent && scriptContent.includes('g-item-sortable')) {
        console.log("Found script with item data. Length:", scriptContent.length);
        const matches = scriptContent.match(/<li.*?g-item-sortable.*?(?:<\\/li>|(?=<li))/g);
        if (matches) {
            lazyMatches += matches.length;
            console.log(`Found ${matches.length} lazy items in this script.`);
        }
    }
});

console.log("Total visible:", items.length, "Total lazy:", lazyMatches);
