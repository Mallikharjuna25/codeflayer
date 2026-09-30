import React, { useEffect, useState, useRef } from 'react';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?';

export default function DecryptedText({
  text = '',
  speed = 40,
  maxIterations = 10,
  sequential = true,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  className = '',
  parentClassName = '',
  encryptedClassName = 'decrypted-scramble',
  animateOn = 'hover', // 'hover' or 'mount' or 'both'
  ...props
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef(null);

  const getNextChar = (originalChar) => {
    if (originalChar === ' ') return ' ';
    if (useOriginalCharsOnly) {
      const distinct = Array.from(new Set(text.split('').filter(c => c !== ' ')));
      return distinct[Math.floor(Math.random() * distinct.length)] || originalChar;
    }
    return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  };

  const scramble = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    setIsScrambling(true);

    intervalRef.current = setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            const progress = sequential ? iteration / maxIterations : 1;
            const threshold =
              revealDirection === 'end'
                ? text.length - Math.floor(progress * text.length)
                : Math.floor(progress * text.length);

            const shouldReveal =
              revealDirection === 'end' ? index >= threshold : index < threshold;

            if (shouldReveal) {
              return text[index];
            }
            return getNextChar(char);
          })
          .join('');
      });

      iteration += 1;
      if (iteration > maxIterations) {
        clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, speed);
  };

  useEffect(() => {
    if (animateOn === 'mount' || animateOn === 'both') {
      scramble();
    }
    return () => clearInterval(intervalRef.current);
  }, [text]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' || animateOn === 'both') {
      setIsHovering(true);
      scramble();
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <span
      className={`decrypted-wrapper ${parentClassName}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <span className={`${className} ${isScrambling ? encryptedClassName : ''}`}>
        {displayText}
      </span>
    </span>
  );
}
