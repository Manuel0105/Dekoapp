const url = "https://figesrofezniocddofsv.supabase.co/functions/v1/amazon-scraper";
const wl = "https://www.amazon.de/hz/wishlist/ls/2XS8E12UVZDNI?ref_=wl_share";

async function run() {
    console.log("Sending POST to", url);
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlistUrl: wl })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}
run();
