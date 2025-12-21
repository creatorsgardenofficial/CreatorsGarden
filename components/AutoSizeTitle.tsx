'use client';

import { useEffect, useRef, useState } from 'react';

interface AutoSizeTitleProps {
  children: string;
  className?: string;
  maxLines?: number;
  minFontSize?: number;
  maxFontSize?: number;
}

export default function AutoSizeTitle({
  children,
  className = '',
  maxLines = 3,
  minFontSize = 0.75,
  maxFontSize = 1.5,
}: AutoSizeTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    if (!titleRef.current) return;

    const element = titleRef.current;
    
    const adjustFontSize = () => {
      // 最大フォントサイズから開始
      let currentSize = maxFontSize;
      element.style.fontSize = `${currentSize}rem`;
      
      // 行の高さを計算（line-height * font-size）
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight || '1.3');
      const maxHeight = maxLines * lineHeight * maxFontSize;
      
      // テキストが収まるまでフォントサイズを小さくする
      const checkFit = () => {
        const actualHeight = element.scrollHeight;
        
        if (actualHeight <= maxHeight || currentSize <= minFontSize) {
          setFontSize(currentSize);
          return;
        }
        
        // フォントサイズを小さくする（収まるサイズを推定）
        const ratio = maxHeight / actualHeight;
        currentSize = Math.max(minFontSize, currentSize * ratio * 0.95);
        element.style.fontSize = `${currentSize}rem`;
        
        // 次のフレームで再チェック
        requestAnimationFrame(checkFit);
      };
      
      // 少し待ってからチェック（レンダリング完了を待つ）
      setTimeout(() => {
        requestAnimationFrame(checkFit);
      }, 0);
    };
    
    // 初期調整
    adjustFontSize();
    
    // リサイズ時にも再計算
    const resizeObserver = new ResizeObserver(() => {
      adjustFontSize();
    });
    
    resizeObserver.observe(element.parentElement || element);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [children, maxLines, minFontSize, maxFontSize]);

  return (
    <h3
      ref={titleRef}
      className={className}
      style={{
        fontSize: `${fontSize}rem`,
        wordBreak: 'break-all',
        overflowWrap: 'break-word',
        wordWrap: 'break-word',
        minWidth: 0,
        maxWidth: '100%',
        width: '100%',
        lineHeight: '1.3',
        overflow: 'visible',
        display: 'block',
      }}
    >
      {children}
    </h3>
  );
}

