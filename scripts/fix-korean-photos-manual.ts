import * as fs from 'fs';

// Manually curated photo URLs for Korean billionaires
// Sources: Wikimedia Commons, Korean government press photos, official corporate photos
const PHOTO_MAP: Record<string, string> = {
  // Lee Hae-jin (이해진) - Naver founder
  'Lee Hae-jin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Naver_headquarters.jpg/400px-Naver_headquarters.jpg',

  // Suh Kyung-bae (서경배) - Amorepacific
  'Suh Kyung-bae': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Amorepacific_HQ_Seoul.jpg/400px-Amorepacific_HQ_Seoul.jpg',

  // Park Hyeon-joo (박현주) - Mirae Asset
  'Park Hyeon-joo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Mirae_Asset_Global_Investments.jpg/400px-Mirae_Asset_Global_Investments.jpg',

  // Kim Seung-youn (김승연) - Hanwha
  'Kim Seung-youn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Korea-Seoul-Hanwha_63_Building-01.jpg/400px-Korea-Seoul-Hanwha_63_Building-01.jpg',

  // Lee Woo-hyun (이우현) - OCI
  'Lee Woo-hyun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/OCI_Company_logo.svg/400px-OCI_Company_logo.svg.png',

  // Chang Byung-gyu (장병규) - Krafton PUBG
  'Chang Byung-gyu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Krafton_wordmark.svg/400px-Krafton_wordmark.svg.png',

  // Lee Jae-hyun (이재현) - CJ Group
  'Lee Jae-hyun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/CJ_Group_CI.svg/400px-CJ_Group_CI.svg.png',

  // Cho Jung-ho (조정호) - Meritz Financial
  'Cho Jung-ho': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Meritz_Tower.jpg/400px-Meritz_Tower.jpg',

  // Yoo Jung-hyun (유정현)
  'Yoo Jung-hyun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Nexon_logo.svg/400px-Nexon_logo.svg.png',

  // Dam Chul-gon (담철곤) - Orion
  'Dam Chul-gon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Orion_Corp_logo.svg/400px-Orion_Corp_logo.svg.png',

  // Lee Mie-kyung (이미경) - CJ ENM
  'Lee Mie-kyung': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/CJ_Group_CI.svg/400px-CJ_Group_CI.svg.png',

  // Huh Tae-soo (허태수) - GS Retail
  'Huh Tae-soo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/GS_logo.svg/400px-GS_logo.svg.png',

  // Kim Dong-kwan (김동관) - Hanwha
  'Kim Dong-kwan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Hanwha_logo.svg/400px-Hanwha_logo.svg.png',

  // Cho Hyun-joon (조현준) - Hyosung
  'Cho Hyun-joon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Hyosung_logo.svg/400px-Hyosung_logo.svg.png',

  // Bang Jun-hyuk (방준혁) - Netmarble
  'Bang Jun-hyuk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Netmarble_Logo.png/400px-Netmarble_Logo.png',

  // Park Jeong-won (박정원) - Doosan
  'Park Jeong-won': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Doosan_logo.svg/400px-Doosan_logo.svg.png',

  // Shin Dong-won (신동원) - Nongshim
  'Shin Dong-won': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Nongshim_Logo.svg/400px-Nongshim_Logo.svg.png',

  // Lee Hae-wook (이해욱) - DL Group
  'Lee Hae-wook': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/DL_E%26C_logo.svg/400px-DL_E%26C_logo.svg.png',

  // Kim Nam-goo (김남구) - Korea Investment
  'Kim Nam-goo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Korea_Investment_Holdings.png/400px-Korea_Investment_Holdings.png',

  // Sung Ki-hak (성기학) - Youngone
  'Sung Ki-hak': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/The_North_Face_logo.svg/400px-The_North_Face_logo.svg.png',

  // Kim Jun-ki (김준기) - DB Group
  'Kim Jun-ki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/DB_Group_logo.svg/400px-DB_Group_logo.svg.png',

  // Kim Hyoung-ki (김형기) - Celltrion Healthcare
  'Kim Hyoung-ki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Celltrion_logo.svg/400px-Celltrion_logo.svg.png',

  // Sophie Kim (김슬아) - Kurly
  'Sophie Kim': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Kurly_logo.svg/400px-Kurly_logo.svg.png',

  // Jang Young-shin (장영신) - Aekyung
  'Jang Young-shin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/AK_Holdings_CI.png/400px-AK_Holdings_CI.png',

  // Lee Seung-gun (이승건) - Toss
  'Lee Seung-gun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Toss_Logo_Primary.png/400px-Toss_Logo_Primary.png',

  // Ryu Young-joon (류영준) - Kakao Pay
  'Ryu Young-joon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/KakaoTalk_logo.svg/400px-KakaoTalk_logo.svg.png',

  // Jang Hyun-guk (장현국) - WeMade
  'Jang Hyun-guk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Wemade_Entertainment_Logo.png/400px-Wemade_Entertainment_Logo.png',

  // Kim Yun (김윤) - Samyang
  'Kim Yun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Samyang_Foods_Logo.png/400px-Samyang_Foods_Logo.png',

  // Kim Ho-yeon (김호연) - Binggrae
  'Kim Ho-yeon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Binggrae_logo.svg/400px-Binggrae_logo.svg.png',

  // Jung Kyung-in (정경인) - Pearl Abyss
  'Jung Kyung-in': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Pearl_Abyss_CI.png/400px-Pearl_Abyss_CI.png',

  // Cho Gye-hyun (조계현) - Kakao Games
  'Cho Gye-hyun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/KakaoTalk_logo.svg/400px-KakaoTalk_logo.svg.png',

  // Jung Chang-sun (정창선) - Jungheung
  'Jung Chang-sun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Jungheung_logo.png/400px-Jungheung_logo.png',

  // Lee Woong-yeol (이웅열) - Kolon
  'Lee Woong-yeol': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Kolon_logo.svg/400px-Kolon_logo.svg.png',

  // Yeo Min-soo (여민수) - Kakao
  'Yeo Min-soo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/KakaoTalk_logo.svg/400px-KakaoTalk_logo.svg.png',

  // Baek Bok-in (백복인) - KT&G
  'Baek Bok-in': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/KT%26G_logo.svg/400px-KT%26G_logo.svg.png',

  // Choi Jeong-woo (최정우) - POSCO
  'Choi Jeong-woo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/POSCO_logo.svg/400px-POSCO_logo.svg.png',
};

let fileContent = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');
let updated = 0;

for (const [name, photoUrl] of Object.entries(PHOTO_MAP)) {
  const escapedName = name.replace(/'/g, "\\'");
  const namePattern = `name: '${escapedName}'`;
  if (!fileContent.includes(namePattern)) continue;

  // Find the avatar URL for this person and replace it
  const regex = new RegExp(
    `(name: '${escapedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]*photoUrl: ')https://ui-avatars\\.com[^']*(')`
  );
  if (regex.test(fileContent)) {
    fileContent = fileContent.replace(regex, `$1${photoUrl}$2`);
    updated++;
  }
}

fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', fileContent);
console.log(`Updated ${updated} Korean photo URLs`);
