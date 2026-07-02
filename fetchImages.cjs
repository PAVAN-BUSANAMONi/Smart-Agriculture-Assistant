const fs = require('fs');
const https = require('https');

const crops = {
  rice: 'Rice',
  wheat: 'Wheat',
  cotton: 'Cotton',
  maize: 'Maize',
  sugarcane: 'Sugarcane',
  chilli: 'Chili_pepper',
  tomato: 'Tomato',
  potato: 'Potato',
  onion: 'Onion',
  groundnut: 'Peanut',
  soybean: 'Soybean',
  mustard: 'Mustard_plant',
  turmeric: 'Turmeric',
  sunflower: 'Sunflower',
  bengal_gram: 'Chickpea',
  red_gram: 'Pigeon_pea',
  black_gram: 'Vigna_mungo',
  green_gram: 'Mung_bean',
  jowar: 'Commercial_sorghum',
  bajra: 'Pearl_millet',
  ragi: 'Eleusine_coracana',
  mango: 'Mango',
  banana: 'Banana',
  guava: 'Guava',
  papaya: 'Papaya',
  pomegranate: 'Pomegranate',
  lemon: 'Lemon',
  rose: 'Rose',
  marigold: 'Tagetes',
  jasmine: 'Jasmine',
  chrysanthemum: 'Chrysanthemum',
  tuberose: 'Polianthes_tuberosa',
  default: 'Agriculture_in_India'
};

const BATCH_SIZE = 10;
const results = {};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SmartAgricultureApp/1.0 (test@example.com)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const keys = Object.keys(crops);
  
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batchKeys = keys.slice(i, i + BATCH_SIZE);
    const titles = batchKeys.map(k => crops[k]).join('|');
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${titles}&prop=pageimages&format=json&pithumbsize=800`;
    
    try {
      const data = await fetchJson(url);
      const pages = data.query.pages;
      
      // Map back to keys
      for (const key of batchKeys) {
        const title = crops[key];
        const page = Object.values(pages).find(p => p.title.toLowerCase().replace(/ /g, '_') === title.toLowerCase().replace(/ /g, '_') || p.title.toLowerCase() === title.toLowerCase());
        
        if (page && page.thumbnail) {
          results[key] = page.thumbnail.source;
        } else {
          results[key] = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Agriculture_in_India.jpg/800px-Agriculture_in_India.jpg';
        }
      }
    } catch (e) {
      console.error('Error fetching batch', e);
    }
  }

  // Generate ts file
  let tsContent = `export const CROP_IMAGES: Record<string, string> = {\n`;
  for (const key of keys) {
    tsContent += `  ${key}: '${results[key] || results.default}',\n`;
  }
  tsContent += `};\n`;

  fs.writeFileSync('src/utils/cropImages.ts', tsContent);
  console.log('Successfully updated src/utils/cropImages.ts');
}

run();
