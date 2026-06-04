import { useEffect, useState } from 'react';

const HEADER_OFFSET = 140;

export function useActiveSection() {
  const [activeId, setActiveId] = useState('hero');

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('section[id]'));
    if (!sections.length) {
      return;
    }

    const updateActiveSection = () => {
      const scrollY = window.scrollY + HEADER_OFFSET;
      const documentBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight - 8;

      if (documentBottom >= pageBottom) {
        setActiveId(sections.at(-1)?.id ?? 'hero');
        return;
      }

      let nextActiveId = sections[0]?.id ?? 'hero';

      for (const section of sections) {
        if (section.offsetTop <= scrollY) {
          nextActiveId = section.id;
        } else {
          break;
        }
      }

      setActiveId(nextActiveId);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  return { activeId };
}
