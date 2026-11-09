import fs from 'fs';

const htmlPath = 'E:\\MY PRO\\New folder (4)\\SCOREAR_FINAL_RELEASE\\podium.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const newPlayers = `const samplePlayers = [
  { name: 'أحمد محمود', score: 1450, avatarId: 'char_01' },
  { name: 'سارة خالد', score: 1180, avatarId: 'char_02' },
  { name: 'عمر التميمي', score: 920, avatarId: 'char_03' },
  { name: 'مريم العتيبي', score: 760, avatarId: 'char_04' },
  { name: 'يوسف الأنصاري', score: 640, avatarId: 'char_05' },
  { name: 'خالد عبدالله', score: 580, avatarId: 'char_07' },
  { name: 'فاطمة الزهراء', score: 520, avatarId: 'char_12' }
];`;

html = html.replace(/const samplePlayers = \[[^\]]+\];/s, newPlayers);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('podium.html samplePlayers updated to real student names');
