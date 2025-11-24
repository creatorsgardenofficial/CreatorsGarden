import { CreatorType } from '@/types';

/**
 * クリエイタータイプのラベル定義（共通）
 */
export const creatorTypeLabels: Record<CreatorType, string> = {
  writer: '小説家',
  illustrator: 'イラストレーター',
  mangaArtist: '漫画家 / マンガ制作',
  composer: '作曲家 / ボカロP',
  singer: '歌手 / 歌い手',
  voiceActor: '声優 / ナレーター',
  gameCreator: 'ゲームクリエイター',
  videoCreator: '動画編集者 / アニメーター',
  artist3d: '3Dモデラー',
  live2dModeler: 'Live2D モデラー',
  developer: 'Webエンジニア / プログラマー',
  other: 'その他',
};

