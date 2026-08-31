import * as cheerio from 'cheerio';

async function testFetch() {
    try {
        const url = 'https://html.duckduckgo.com/html/?q=site:jusbrasil.com.br/jurisprudencia+responsabilidade+civil';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
        });
        const text = await response.text();
        const $ = cheerio.load(text);
        
        console.log("Title:", $('title').text());
        
        $('.result__body').each((i, el) => {
            console.log("Result:", $(el).find('.result__title').text().trim());
            console.log("Snippet:", $(el).find('.result__snippet').text().trim());
        });
    } catch (e) {
        console.log('Fetch error:', e.message);
    }
}
testFetch();
