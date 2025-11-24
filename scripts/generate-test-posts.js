const fs = require('fs');
const path = require('path');

// データディレクトリのパス
const dataDir = path.join(__dirname, '../data');
const postsFile = path.join(dataDir, 'posts.json');
const usersFile = path.join(dataDir, 'users.json');

// 既存のデータを読み込む
const existingPosts = JSON.parse(fs.readFileSync(postsFile, 'utf-8'));
const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));

// 投稿タイプとクリエイタータイプの配列
const postTypes = ['collab', 'idea', 'seeking'];
const creatorTypes = ['novelist', 'illustrator', 'singer', 'composer', 'other'];
const statuses = ['open', 'closed'];

// タイトルのテンプレート
const titleTemplates = {
  collab: [
    '一緒に作品を作りませんか？',
    'コラボパートナー募集',
    '共同制作のお誘い',
    '一緒に創作活動をしませんか？',
    'コラボレーション企画',
    'パートナーを探しています',
    '一緒に作品を完成させましょう',
    'コラボメンバー募集',
  ],
  idea: [
    '新しいアイデアを共有します',
    'こんな作品を作りたいです',
    'アイデアを形にしたい',
    '創作のアイデア共有',
    'こんなプロジェクトを考えています',
    'アイデアを実現したい',
    '新しい創作のアイデア',
    '作品のアイデアを共有',
  ],
  seeking: [
    'パートナーを探しています',
    '一緒に活動できる方を探しています',
    'メンバー募集',
    '協力してくれる方を探しています',
    'パートナー募集',
    '一緒に作品を作れる方を探しています',
    'メンバーを探しています',
    '協力者募集',
  ],
};

// コンテンツのテンプレート
const contentTemplates = [
  'こんにちは。新しい作品を作りたいと考えています。興味のある方はぜひご連絡ください。',
  '一緒に素晴らしい作品を作りましょう。経験は問いません。',
  '創作活動を通じて、新しい出会いを求めています。',
  '作品を作る過程を楽しみながら、一緒に成長していきましょう。',
  '新しい挑戦をしたいと考えています。一緒に取り組んでくれる方を探しています。',
  '創作の楽しさを共有できるパートナーを探しています。',
  'アイデアを形にするために、協力してくれる方を探しています。',
  '一緒に作品を作り上げる喜びを分かち合いましょう。',
];

// タグの候補
const tagOptions = [
  '小説', 'イラスト', '音楽', '漫画', 'アニメ', 'ゲーム', '創作', 'コラボ',
  'ファンタジー', 'SF', '恋愛', 'ミステリー', 'ホラー', 'アクション', 'コメディ',
  'オリジナル', '二次創作', '同人', '商業', 'アマチュア', 'プロ',
];

// ランダムな要素を選択する関数
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ランダムな日付を生成（過去30日以内）
function randomDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

// 100件のテスト投稿を生成
const newPosts = [];
for (let i = 0; i < 100; i++) {
  const user = randomElement(users);
  const postType = randomElement(postTypes);
  const status = randomElement(statuses);
  
  // タイトルとコンテンツを生成
  const title = randomElement(titleTemplates[postType]);
  const content = randomElement(contentTemplates);
  
  // タグをランダムに1-3個選択
  const numTags = Math.floor(Math.random() * 3) + 1;
  const tags = [];
  const availableTags = [...tagOptions];
  for (let j = 0; j < numTags; j++) {
    if (availableTags.length === 0) break;
    const tagIndex = Math.floor(Math.random() * availableTags.length);
    tags.push(availableTags.splice(tagIndex, 1)[0]);
  }
  
  // URLは50%の確率で追加
  const url = Math.random() > 0.5 ? `https://example.com/portfolio/${i}` : undefined;
  
  // 日時を生成
  const createdAt = randomDate();
  const updatedAt = createdAt; // 新規投稿なので同じ
  
  const post = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
    userId: user.id,
    username: user.username,
    creatorType: user.creatorType,
    type: postType,
    title: `${title} ${i + 1}`,
    content: `${content}\n\n投稿番号: ${i + 1}`,
    tags: tags,
    url: url,
    status: status,
    createdAt: createdAt,
    updatedAt: updatedAt,
  };
  
  newPosts.push(post);
}

// 既存の投稿と新しい投稿を結合
const allPosts = [...existingPosts, ...newPosts];

// ファイルに書き込む
fs.writeFileSync(postsFile, JSON.stringify(allPosts, null, 2), 'utf-8');

console.log(`✅ テスト投稿を100件追加しました。合計: ${allPosts.length}件`);

