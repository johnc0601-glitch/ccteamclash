'use client';

import Link from 'next/link';
import type {ComponentProps} from 'react';
import {useMatchdayIntro} from './MatchdayIntroProvider';

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'onNavigate'> & {href: string};

export function MatchdayLink({href, ...props}: Props) {
  const start = useMatchdayIntro();
  return <Link {...props} href={href} onNavigate={() => start(href)} />;
}
