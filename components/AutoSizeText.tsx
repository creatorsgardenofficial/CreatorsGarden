'use client';

import { useEffect, useRef, useState } from 'react';

interface AutoSizeTextProps {
  children: string;
  className?: string;
  minFontSize?: number;
  maxFontSize?: number;
  maxWidth?: string;
}

export default function AutoSizeText({
  children,
  className = '',
  minFontSize = 0.5,
  maxFontSize = 0.875,
  maxWidth = '100%',
}: AutoSizeTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    if (!textRef.current) return;

    const element = textRef.current;
    
    const adjustFontSize = () => {
      // maxWidthをピクセル値に変換
      let maxWidthPx: number;
      if (maxWidth === '100%') {
        const containerWidth = element.parentElement?.clientWidth || element.clientWidth;
        maxWidthPx = containerWidth;
      } else {
        // "200px" -> 200, "10rem" -> 10 * 16など
        const numericValue = parseFloat(maxWidth);
        if (maxWidth.includes('px')) {
          maxWidthPx = numericValue;
        } else if (maxWidth.includes('rem')) {
          maxWidthPx = numericValue * 16; // 1rem = 16px (通常)
        } else {
          const containerWidth = element.parentElement?.clientWidth || element.clientWidth;
          maxWidthPx = numericValue || containerWidth;
        }
      }
      
      // より確実な方法：実際の幅を測定しながらフォントサイズを調整
      let currentSize = maxFontSize;
      element.style.fontSize = `${currentSize}rem`;
      element.style.whiteSpace = 'nowrap';
      element.style.visibility = 'hidden';
      element.style.position = 'absolute';
      element.style.display = 'inline-block';
      
      // 実際の幅を測定
      const measureWidth = () => {
        element.style.visibility = 'hidden';
        element.style.position = 'absolute';
        const width = element.scrollWidth;
        element.style.visibility = 'visible';
        element.style.position = 'static';
        return width;
      };
      
      let actualWidth = measureWidth();
      
      // 収まるまでフォントサイズを小さくする
      while (actualWidth > maxWidthPx && currentSize > minFontSize) {
        currentSize = Math.max(minFontSize, currentSize - 0.05);
        element.style.fontSize = `${currentSize}rem`;
        actualWidth = measureWidth();
        
        // 無限ループを防ぐ
        if (currentSize <= minFontSize) break;
      }
      
      // 最終設定
      element.style.visibility = 'visible';
      element.style.position = 'static';
      element.style.fontSize = `${currentSize}rem`;
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.style.textOverflow = 'clip';
      setFontSize(currentSize);
    };
    
    // 初期調整（少し待ってから実行）
    const timeoutId = setTimeout(() => {
      adjustFontSize();
    }, 150);
    
    // リサイズ時にも再計算
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      setTimeout(() => {
        adjustFontSize();
      }, 150);
    });
    
    resizeObserver.observe(element.parentElement || element);
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [children, minFontSize, maxFontSize, maxWidth]);

  return (
    <span
      ref={textRef}
      className={className}
      style={{
        fontSize: `${fontSize}rem`,
        whiteSpace: 'nowrap',
        overflow: 'visible',
        textOverflow: 'clip',
        display: 'inline-block',
        maxWidth: maxWidth,
      }}
    >
      {children}
    </span>
  );
}

