import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('amazon_raw.html', 'utf-8');
const $ = cheerio.load(html);

const items: any[] = [];
let missingTitles = 0;

const parseItem = (_i: number, el: any, local$: any) => {
    const element = local$(el);
    const idStr = element.attr('data-id') || element.attr('data-itemid') || `f-${_i}`;
    let titleStr = element.find('a.a-link-normal[title]').attr('title') || element.find('.g-title a').text().trim();
    
    // In lazy scripts, the text might be empty if the title attribute isn't there, or the structure is different
    // Let's dig deeper:
    if (!titleStr) {
        titleStr = element.find('h3 a').text().trim() || element.find('a.a-size-base').text().trim() || element.text().substring(0, 50).trim();
    }

    if (titleStr) {
        items.push({ id: idStr, title: titleStr });
    } else {
        missingTitles++;
    }
};

$('.g-item-sortable').each((_i, el) => parseItem(_i, el, $));
console.log("Visible Items:", items.length, "Missing titles:", missingTitles);

const scriptTags = $('script').toArray();
let lazyMatches = 0;

for (const script of scriptTags) {
    const scriptContent = $(script).html();
    if (scriptContent && scriptContent.includes('g-item-sortable')) {
        const escapedHtmlMatches = scriptContent.match(/<li.*?g-item-sortable.*?(?:<\\/li>|(?=<li))/g);
        if (escapedHtmlMatches) {
            lazyMatches += escapedHtmlMatches.length;
            for (const matchStr of escapedHtmlMatches) {
                let cleanHtml = matchStr.replace(/\\"/g, '"').replace(/\\\\n/g, '').replace(/\\\\\\/`/g, '/');
                const $lazy = cheerio.load(cleanHtml);
                $lazy('.g-item-sortable').each((_i, el) => parseItem(_i, el, $lazy));
            }
        }
    }
}

console.log("Lazy item HTML matches:", lazyMatches);
console.log("Final scraped elements:", items.length);
console.log("Total missing titles from lazys:", missingTitles);
