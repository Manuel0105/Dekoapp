import fs from 'fs';

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
    fs.writeFileSync("amazon_raw.html", html);
    console.log("Saved raw HTML to amazon_raw.html. Length: " + html.length);
}

fetchAmazonList();
