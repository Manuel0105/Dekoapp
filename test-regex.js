const fs = require('fs');
const html = fs.readFileSync('amazon_raw.html', 'utf-8');

// 1. Visible elements
let visible = 0;
const visibleRegex = /<li[^>]*g-item-sortable[^>]*>/g;
let m;
while ((m = visibleRegex.exec(html)) !== null) {
  visible++;
}
console.log(`Visible g-item-sortable wrappers: ${visible}`);

// 2. Identify lazy loaded items. Are there ASINs in script tags?
const scriptRegex = /<script.*?>([\\s\\S]*?)<\\/script>/gi;
let lazyCount = 0;
while ((m = scriptRegex.exec(html)) !== null) {
  const content = m[1];
  if (content.includes('g-item-sortable') || content.includes('data-itemid') || content.includes('data-id=')) {
      const listMatches = content.match(/<li[^>]*g-item-sortable[^>]*>/g) || [];
      if (listMatches.length > 0) {
          lazyCount += listMatches.length;
          console.log(`Script contains ${listMatches.length} lazy-loaded items`);
      }
      
      const weirdJsonMatches = content.match(/g-item-sortable/g);
      if (weirdJsonMatches) {
          console.log(`Script contains 'g-item-sortable' ${weirdJsonMatches.length} times`);
      }
  }
}
console.log(`Total lazy items identified: ${lazyCount}`);
