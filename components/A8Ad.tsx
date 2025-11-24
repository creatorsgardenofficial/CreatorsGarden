'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

interface A8AdProps {
  /**
   * A8.netの広告コード（HTML形式）
   * 単一の広告コード、またはJSON配列形式の文字列
   * 例: <script type="text/javascript" src="https://statics.a8.net/a8sales/a8sales.js"></script>
   *     <a href="https://px.a8.net/svt/ejp?a8mat=..." target="_blank" rel="nofollow">...</a>
   * 複数の場合: ["広告コード1", "広告コード2", "広告コード3"]
   */
  adCode?: string;
  /**
   * 広告のサイズ（オプション）
   */
  className?: string;
}

/**
 * 広告コードの配列からランダムに1つを選択
 */
function getRandomAdCode(adCodes: string[]): string {
  if (adCodes.length === 0) return '';
  if (adCodes.length === 1) return adCodes[0];
  const randomIndex = Math.floor(Math.random() * adCodes.length);
  return adCodes[randomIndex];
}

/**
 * 環境変数から広告コードの配列を取得
 */
function parseAdCodes(adCodeString?: string): string[] {
  if (!adCodeString || adCodeString.trim() === '') return [];

  try {
    // JSON配列形式を試す
    const parsed = JSON.parse(adCodeString);
    if (Array.isArray(parsed)) {
      return parsed.filter((code): code is string => typeof code === 'string' && code.trim() !== '');
    }
  } catch {
    // JSONパースに失敗した場合は単一の広告コードとして扱う
  }

  // 単一の広告コードとして扱う
  return [adCodeString];
}

export default function A8Ad({ adCode, className = '' }: A8AdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState<Set<string>>(new Set());
  
  // 広告コードの配列を取得
  const adCodes = useMemo(() => {
    const envAdCode = process.env.NEXT_PUBLIC_A8_AD_CODE || '';
    const sourceCode = adCode || envAdCode;
    return parseAdCodes(sourceCode);
  }, [adCode]);

  // ランダムに選択された広告コード
  const [selectedAdCode, setSelectedAdCode] = useState<string>('');

  // コンポーネントがマウントされたときにランダムに選択
  useEffect(() => {
    if (adCodes.length > 0) {
      setSelectedAdCode(getRandomAdCode(adCodes));
    }
  }, [adCodes]);

  useEffect(() => {
    if (!selectedAdCode || !adRef.current) {
      return;
    }

    const container = adRef.current;
    
    // 既存のコンテンツをクリア
    container.innerHTML = '';

    // 広告コードを解析
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${selectedAdCode}</div>`, 'text/html');
    const wrapper = doc.querySelector('div');

    if (!wrapper) {
      return;
    }

    // スクリプトタグを取得
    const scripts = wrapper.querySelectorAll('script');
    const scriptUrls: string[] = [];

    scripts.forEach((script) => {
      if (script.src) {
        scriptUrls.push(script.src);
      }
    });

    // スクリプトを読み込む（まだ読み込まれていない場合のみ）
    const loadScripts = async () => {
      for (const scriptUrl of scriptUrls) {
        if (scriptsLoaded.has(scriptUrl)) continue;

        try {
          const script = document.createElement('script');
          script.src = scriptUrl;
          script.type = 'text/javascript';
          script.async = true;
          
          await new Promise((resolve, reject) => {
            script.onload = () => {
              setScriptsLoaded(prev => new Set([...prev, scriptUrl]));
              resolve(true);
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        } catch (error) {
          console.warn(`Failed to load A8.net script: ${scriptUrl}`, error);
        }
      }

      // スクリプト読み込み後にHTMLコンテンツを挿入
      // scriptタグを除いたHTMLを取得
      const htmlContent = selectedAdCode
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();

      if (htmlContent) {
        container.innerHTML = htmlContent;
      } else {
        // scriptタグのみの場合は、広告リンクが後から動的に生成される可能性があるため
        // コンテナを保持
        container.innerHTML = '';
      }
    };

    loadScripts();
  }, [selectedAdCode, scriptsLoaded]);

  if (adCodes.length === 0) {
    return null;
  }

  return (
    <div
      ref={adRef}
      className={`a8-ad ${className}`}
      style={{ minHeight: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    />
  );
}

