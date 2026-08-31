import * as cheerio from 'cheerio';

async function testFetch() {
    try {
        const url = 'https://www.jusbrasil.com.br/jurisprudencia/busca?q=responsabilidade+civil';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });
        const text = await response.text();
        const $ = cheerio.load(text);
        
        console.log("Title:", $('title').text());
        
        const articles = $('article').length;
        console.log('Article tags:', articles);
        
        const searchResults = $('div[data-cy="search-result"]').length;
        console.log('Data-cy search-result tags:', searchResults);

        // Print some classes found
        console.log('Some classes:', text.substring(0, 500));
    } catch (e) {
        console.log('Fetch error:', e.message);
    }
}
testFetch();
