import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { wishlistUrl } = await req.json();

    if (!wishlistUrl || !wishlistUrl.includes('amazon')) {
      throw new Error('Bitte eine gültige Amazon Wunschlisten-URL angeben.');
    }

    console.log(`Fetching Wishlist: ${wishlistUrl}`);
    
    // Fetch the Amazon Wishlist using a fake user agent to bypass simple blocks
    const response = await fetch(wishlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen der Liste (Status: ${response.status})`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: any[] = [];

    // Amazon Wishlist DOM Parsing (This can be fragile depending on Amazon's A/B tests)
    // Looking for grid-items or list-items
    $('.g-item-sortable').each((_i, el) => {
      const element = $(el);
      
      const idStr = element.attr('data-itemid') || '';
      if (!idStr) return; // Not a valid item
      
      const title = element.find('a.a-link-normal[title]').attr('title') || 
                    element.find('.g-title a').text().trim();
                    
      const priceText = element.find('.a-price .a-offscreen').first().text().trim() ||
                        element.find('.a-color-price').first().text().trim();
                        
      let price = null;
      if (priceText) {
         // Parse "29,99 €" to float
         const numMatch = priceText.match(/[\d.,]+/);
         if (numMatch) {
            price = parseFloat(numMatch[0].replace('.', '').replace(',', '.'));
         }
      }
      
      const imgEl = element.find('img').first();
      let imageUrl = imgEl.attr('src');
      // Replace small image format marker with larger one if standard Amazon structure is found
      if (imageUrl && imageUrl.includes('._S')) {
         imageUrl = imageUrl.replace(/\._S[^\.]+\./, '.'); 
      }
      
      const linkEl = element.find('.g-title a');
      let productUrl = linkEl.attr('href');
      if (productUrl && productUrl.startsWith('/')) {
        productUrl = 'https://www.amazon.de' + productUrl;
      }
      
      // We extract the asin if possible to use as external_id
      const asinMatch = productUrl ? productUrl.match(/\/dp\/([A-Z0-9]{10})/) : null;
      const external_id = asinMatch ? asinMatch[1] : `WL-${idStr}`;

      if (title) {
        items.push({
          external_id,
          title,
          price,
          image_url: imageUrl,
          product_url: productUrl,
          room: 'Lesezeichen', // Default fallback room
          is_new: true,
          purchase_status: 'geplant'
        });
      }
    });

    console.log(`Parsed ${items.length} items from wishlist.`);

    if (items.length === 0) {
       // Mock fallback strategy if Amazon blocks scraping or structure changed completely
       console.log('DOM Parsing failed or empty list. Proceeding with dummy data extraction attempt or error.');
       throw new Error('Keine Gegenstände gefunden. Eventuell ist die Liste privat, leer oder Amazon blockiert gerade die Abfrage.');
    }

    // Initialize Supabase Client with SERVICE_ROLE key so we can bypass RLS for inserting raw items
    const supabaseClient = createClient(
      Deno.env.get('APP_SUPABASE_URL') ?? '',
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check user auth who made the request (optional security check)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) {
         console.log(`Request authenticated from user: ${user.id}`);
      }
    }

    // Upsert items (ignore conflicts based on external_id)
    const { error: dbError } = await supabaseClient
      .from('items')
      .upsert(items, { onConflict: 'external_id', ignoreDuplicates: true });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ 
        message: 'Erfolgreich importiert',
        itemsFound: items.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
