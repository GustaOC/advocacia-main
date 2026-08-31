import * as cheerio from 'cheerio';

async function testFetch() {
    try {
        const url = 'https://esaj.tjms.jus.br/cjsg/pesquisa.do?conversationId=&cbPesquisa=NUMPROC&texto=responsabilidade+civil';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
        });
        const text = await response.text();
        const $ = cheerio.load(text);
        
        console.log("Title:", $('title').text());
        const results = $('.fundocinza1').length;
        console.log('Results:', results);
    } catch (e) {
        console.log('Fetch error:', e.message);
    }
}
testFetch();
