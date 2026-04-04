import * as fs from 'fs';

// Korean name mapping and photo URLs for Korean billionaires
// Photos sourced from Wikimedia Commons, Korean news agencies, and company press releases
const KOREAN_DATA: Record<string, { nameKo: string; photoUrl?: string }> = {
  // Samsung family
  'Lee Kun-hee': { nameKo: '이건희', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Lee_Kun-Hee.jpg/400px-Lee_Kun-Hee.jpg' },
  'Jay Y. Lee': { nameKo: '이재용', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Lee_Jae-yong_in_2016.jpg/400px-Lee_Jae-yong_in_2016.jpg' },
  'Lee Jae-yong': { nameKo: '이재용', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Lee_Jae-yong_in_2016.jpg/400px-Lee_Jae-yong_in_2016.jpg' },
  'Lee Boo-jin': { nameKo: '이부진', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/2024_Korea_Grand_Sale_01_%28cropped%29.jpg/400px-2024_Korea_Grand_Sale_01_%28cropped%29.jpg' },
  'Lee Seo-hyun': { nameKo: '이서현' },
  'Lee Myung-hee': { nameKo: '이명희' },
  'Lee Myung-hee (Shinsegae)': { nameKo: '이명희' },
  'Hong Ra-hee': { nameKo: '홍라희' },

  // Hyundai family
  'Chung Mong-koo': { nameKo: '정몽구', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Chung_Mong-koo.jpg/400px-Chung_Mong-koo.jpg' },
  'Chung Euisun': { nameKo: '정의선', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Chung_Eui-sun_%28%EC%A0%95%EC%9D%98%EC%84%A0%29.jpg/400px-Chung_Eui-sun_%28%EC%A0%95%EC%9D%98%EC%84%A0%29.jpg' },
  'Chung Mong-joon': { nameKo: '정몽준', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Chung_Mong-joon.jpg/400px-Chung_Mong-joon.jpg' },
  'Chung Mong-gyu': { nameKo: '정몽규' },

  // SK Group
  'Chey Tae-won': { nameKo: '최태원', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Korea_Portuguese_Business_Forum_01_%28cropped%29.jpg/400px-Korea_Portuguese_Business_Forum_01_%28cropped%29.jpg' },

  // Lotte
  'Shin Dong-bin': { nameKo: '신동빈', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Shin_Dong-Bin.jpg/400px-Shin_Dong-Bin.jpg' },

  // Kakao / Tech
  'Kim Beom-su': { nameKo: '김범수', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Kim_Bum-soo%2C_Chairman_of_board%2C_Kakao_Inc.jpg' },
  'Lee Hae-jin': { nameKo: '이해진' },
  'Yeo Min-soo': { nameKo: '여민수' },

  // Naver
  // Gaming
  'Kim Jung-ju': { nameKo: '김정주', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Kim_Jung-ju_presenting_in_2016_%28cropped%29.jpg/400px-Kim_Jung-ju_presenting_in_2016_%28cropped%29.jpg' },
  'Kwon Hyuk-bin': { nameKo: '권혁빈' },
  'Kim Taek-jin': { nameKo: '김택진' },
  'Chang Byung-gyu': { nameKo: '장병규' },
  'Bang Jun-hyuk': { nameKo: '방준혁' },
  'Jung Kyung-in': { nameKo: '정경인' },
  'Cho Gye-hyun': { nameKo: '조계현' },
  'Jang Hyun-guk': { nameKo: '장현국' },

  // BTS / Entertainment
  'Bang Si-hyuk': { nameKo: '방시혁', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Bang_Si-hyuk_on_24_June_2022.jpg/400px-Bang_Si-hyuk_on_24_June_2022.jpg' },
  'Lee Soo-man': { nameKo: '이수만', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Lee_Soo-man_at_KCON_2012.jpg/400px-Lee_Soo-man_at_KCON_2012.jpg' },
  'Yang Hyun-suk': { nameKo: '양현석', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Yang_Hyun-suk_in_Jun_2011.jpg/400px-Yang_Hyun-suk_in_Jun_2011.jpg' },
  'Park Jin-young': { nameKo: '박진영', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Park_Jin-young_at_the_Sisa_IN_10th_anniversary_gala.jpg/400px-Park_Jin-young_at_the_Sisa_IN_10th_anniversary_gala.jpg' },

  // Biotech / Healthcare
  'Seo Jung-jin': { nameKo: '서정진', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Seo_Jung-jin_%28Celltrion%29.jpg/400px-Seo_Jung-jin_%28Celltrion%29.jpg' },
  'Kim Hyoung-ki': { nameKo: '김형기' },

  // Coupang
  'Bom Kim': { nameKo: '김봉진' },

  // CJ Group
  'Lee Jae-hyun': { nameKo: '이재현' },
  'Lee Mie-kyung': { nameKo: '이미경' },

  // Cosmetics
  'Suh Kyung-bae': { nameKo: '서경배' },

  // Hanwha
  'Kim Seung-youn': { nameKo: '김승연' },
  'Kim Dong-kwan': { nameKo: '김동관' },

  // Shinsegae / E-Mart
  'Chung Yong-jin': { nameKo: '정용진' },

  // GS Group
  'Huh Chang-soo': { nameKo: '허창수' },
  'Huh Tae-soo': { nameKo: '허태수' },

  // LG
  'Koo Kwang-mo': { nameKo: '구광모' },

  // Korean Air / Hanjin
  'Cho Won-tae': { nameKo: '조원태' },
  'Cho Won-hyuk': { nameKo: '조원혁' },

  // Hyosung
  'Cho Hyun-joon': { nameKo: '조현준' },

  // Doosan
  'Park Jeong-won': { nameKo: '박정원' },

  // Mirae Asset
  'Park Hyeon-joo': { nameKo: '박현주' },

  // POSCO
  'Choi Jeong-woo': { nameKo: '최정우' },

  // DL Group
  'Lee Hae-wook': { nameKo: '이해욱' },

  // Finance
  'Kim Nam-goo': { nameKo: '김남구' },
  'Kim Jun-ki': { nameKo: '김준기' },

  // SoftBank (Korean-Japanese)
  'Son Masayoshi': { nameKo: '손정의' },

  // Construction
  'Jung Chang-sun': { nameKo: '정창선' },

  // OCI
  'Lee Woo-hyun': { nameKo: '이우현' },

  // Food
  'Shin Dong-won': { nameKo: '신동원' },
  'Dam Chul-gon': { nameKo: '담철곤' },
  'Kim Yun': { nameKo: '김윤' },
  'Kim Ho-yeon': { nameKo: '김호연' },
  'Kwon Jae-hyun': { nameKo: '권재현' },

  // Kolon
  'Lee Woong-yeol': { nameKo: '이웅열' },

  // Apparel
  'Sung Ki-hak': { nameKo: '성기학' },

  // Aekyung
  'Jang Young-shin': { nameKo: '장영신' },

  // Kumho
  'Park Sam-koo': { nameKo: '박삼구' },

  // Tobacco
  'Baek Bok-in': { nameKo: '백복인' },

  // Fintech
  'Ryu Young-joon': { nameKo: '류영준' },
  'Lee Seung-gun': { nameKo: '이승건' },

  // Woowa / Baemin
  'Kim Bong-jin': { nameKo: '김봉진' },

  // Market Kurly
  'Sophie Kim': { nameKo: '김슬아' },

  // Sports / Celebrities
  'Son Heung-min': { nameKo: '손흥민', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Son_Heung-min_20191112a.jpg/400px-Son_Heung-min_20191112a.jpg' },
  'BTS (RM) Kim Nam-joon': { nameKo: '김남준 (RM)', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/RM_at_the_White_House.jpg/400px-RM_at_the_White_House.jpg' },
  'Lee Min-ho': { nameKo: '이민호', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Lee_Min_Ho_in_2023.jpg/400px-Lee_Min_Ho_in_2023.jpg' },

  // From CSV - Korean billionaires with English names
  'Michael Kim': { nameKo: '김병주' },
  'Kwon Hyuk-Bin': { nameKo: '권혁빈' },
  'Kim Taek-Jin': { nameKo: '김택진' },
  'Lee Hae-Jin': { nameKo: '이해진' },
  'Suh Kyung-Bae': { nameKo: '서경배' },
  'Chung Yong-Jin': { nameKo: '정용진' },
  'Kim Seung-Youn': { nameKo: '김승연' },
  'Park Hyeon-Joo': { nameKo: '박현주' },
  'Lee Woo-Hyun': { nameKo: '이우현' },
  'Kim Jun-Ki': { nameKo: '김준기' },
  'Bom Suk Kim': { nameKo: '김범석' },
};

// Read existing file
let fileContent = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');

let updatedCount = 0;
let photoCount = 0;

for (const [name, data] of Object.entries(KOREAN_DATA)) {
  const escapedName = name.replace(/'/g, "\\'");

  // Find the line with this name
  const namePattern = `name: '${escapedName}'`;
  if (!fileContent.includes(namePattern)) continue;

  // Add nameKo if not already present
  if (!fileContent.includes(`name: '${escapedName}', nameKo:`)) {
    const escapedNameKo = data.nameKo.replace(/'/g, "\\'");
    fileContent = fileContent.replace(
      `name: '${escapedName}',`,
      `name: '${escapedName}', nameKo: '${escapedNameKo}',`
    );
    updatedCount++;
  }

  // Update photo if we have a better one and current is avatar
  if (data.photoUrl) {
    const lineRegex = new RegExp(`name: '${escapedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'.*?photoUrl: '(.*?)'`);
    const match = fileContent.match(lineRegex);
    if (match && match[1].includes('ui-avatars.com')) {
      fileContent = fileContent.replace(match[1], data.photoUrl);
      photoCount++;
    }
  }
}

fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', fileContent);
console.log(`Updated ${updatedCount} Korean names, ${photoCount} photos`);
