import React, { useState, useEffect } from 'react';

const PHRASES = [
  'Recover lost rankings 3x faster than writing new content.',
  'Detect silent 20%+ traffic drops across your whole site.',
  'Turn declining blog posts & product guides into organic revenue.',
  'Generate instant AI refresh blueprints with 16-month Search Console data.',
  'Built for SaaS, eCommerce, Agencies & Digital Businesses.',
];

export default function HeroTypewriter() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(50);

  useEffect(() => {
    const fullText = PHRASES[currentPhraseIndex];

    const handleTyping = () => {
      if (!isDeleting) {
        // Typing forward
        setDisplayedText(fullText.substring(0, displayedText.length + 1));
        setTypingSpeed(45 + Math.random() * 25);

        if (displayedText.length + 1 === fullText.length) {
          // Finished typing, pause before deleting
          setTimeout(() => setIsDeleting(true), 2400);
        }
      } else {
        // Deleting backward
        setDisplayedText(fullText.substring(0, displayedText.length - 1));
        setTypingSpeed(25);

        if (displayedText.length === 0) {
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentPhraseIndex, typingSpeed]);

  return (
    <div className="min-h-[64px] sm:min-h-[56px] flex items-center justify-center">
      <p className="text-base sm:text-xl font-medium text-slate-300 max-w-2xl mx-auto leading-relaxed">
        <span className="text-indigo-400 font-bold">&gt;&nbsp;</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-indigo-400">
          {displayedText}
        </span>
        <span className="inline-block w-2 sm:w-2.5 h-4 sm:h-5 ml-1 bg-indigo-400 align-middle animate-pulse"></span>
      </p>
    </div>
  );
}
